import { NextResponse } from "next/server";
import { getDb, getUserProfileByAuthId, upsertUserProfile, getUserPreferences } from "@/lib/db";
import { getTwilioClient, getVerifyServiceSid } from "@/lib/twilio";
import { normalizeIndianPhoneNumber } from "@/lib/phone";
import crypto from "crypto";

const COOKIE_PREFIX = "__Secure-neon-auth";
const SESSION_COOKIE_NAME = `${COOKIE_PREFIX}.session_token`;
const SESSION_DATA_COOKIE_NAME = `${COOKIE_PREFIX}.local.session_data`;

/**
 * Create a HS256-signed JWT identical to the format used by @neondatabase/auth
 * for the session_data cookie. This allows the Neon Auth SDK's getSession()
 * to read the session from the cookie cache without hitting the upstream.
 */
function createSessionDataJWT(
  sessionData: {
    session: Record<string, unknown>;
    user: Record<string, unknown>;
  },
  secret: string,
  expSeconds: number
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    ...sessionData,
    iat: nowSeconds,
    exp: expSeconds,
    sub: (sessionData.user?.id as string) || "anonymous",
  };
  const b64Header = Buffer.from(JSON.stringify(header)).toString("base64url");
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${b64Header}.${b64Payload}`)
    .digest("base64url");
  return `${b64Header}.${b64Payload}.${signature}`;
}

/**
 * POST /api/auth/mobile/verify-otp
 *
 * Verifies the OTP with Twilio Verify v2.
 * On Twilio "approved":
 * 1. Finds or creates the user in neon_auth.user
 * 2. Links neon_auth.account
 * 3. Creates neon_auth.session
 * 4. Links user_profiles (and loads existing preferences)
 * 5. Returns profile status and sets session cookies
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || body.phoneNumber;
    const code = (body.code || body.otp || "").toString().trim();

    if (!rawPhone || !code) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number and 6-digit verification code are required.",
        },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndianPhoneNumber(rawPhone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid 10-digit Indian mobile number.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4,8}$/.test(code)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid OTP. Please try again.",
        },
        { status: 400 }
      );
    }

    const client = getTwilioClient();
    const serviceSid = getVerifyServiceSid();

    let verificationCheck;
    try {
      verificationCheck = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({
          to: normalizedPhone,
          code,
        });
    } catch (checkError: any) {
      const twilioCode = checkError?.code;

      if (twilioCode === 20404) {
        return NextResponse.json(
          {
            success: false,
            message: "OTP expired. Please request a new one.",
          },
          { status: 400 }
        );
      }

      if (twilioCode === 60202 || twilioCode === 60205) {
        return NextResponse.json(
          {
            success: false,
            message: "Maximum verification attempts reached. Please request a new code.",
          },
          { status: 429 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired verification code.",
        },
        { status: 400 }
      );
    }

    // Only consider authentication successful when Twilio returns "approved"
    if (verificationCheck.status !== "approved") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired verification code.",
        },
        { status: 400 }
      );
    }

    // Approved: Proceed with existing Neon Auth + user profile architecture
    const sql = getDb();
    const phoneEmail = `${normalizedPhone.replace(/[^0-9]/g, "")}@phone.fetchit.local`;
    const now = new Date();

    // Find or create user in neon_auth.user
    const users = await sql`
      SELECT id, name, email FROM neon_auth.user
      WHERE email = ${phoneEmail}
      LIMIT 1
    `;

    let userId: string;
    let isNewUser = false;

    if (users.length > 0) {
      userId = users[0].id;
    } else {
      userId = crypto.randomUUID();
      isNewUser = true;
      await sql`
        INSERT INTO neon_auth.user (id, name, email, "emailVerified", "createdAt", "updatedAt")
        VALUES (${userId}, ${"Mobile User"}, ${phoneEmail}, ${true}, ${now}, ${now})
      `;
    }

    // Create account entry if not exists
    const accounts = await sql`
      SELECT id FROM neon_auth.account
      WHERE "userId" = ${userId} AND "providerId" = 'phone'
      LIMIT 1
    `;
    if (accounts.length === 0) {
      await sql`
        INSERT INTO neon_auth.account (id, "accountId", "providerId", "userId", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${normalizedPhone}, 'phone', ${userId}, ${now}, ${now})
      `;
    }

    // Create session in neon_auth.session
    const sessionId = crypto.randomUUID();
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await sql`
      INSERT INTO neon_auth.session (id, "userId", token, "expiresAt", "createdAt", "updatedAt")
      VALUES (${sessionId}, ${userId}, ${sessionToken}, ${sessionExpiresAt}, ${now}, ${now})
    `;

    // Load or create user_profiles
    let profile = await getUserProfileByAuthId(userId);
    if (!profile) {
      profile = await upsertUserProfile({
        auth_user_id: userId,
        phone: normalizedPhone,
      });
    } else if (!profile.phone || profile.phone !== normalizedPhone) {
      profile = await upsertUserProfile({
        auth_user_id: userId,
        phone: normalizedPhone,
      });
    }

    // Check preferences for existing user
    const preferences = profile ? await getUserPreferences(profile.id) : null;

    // Check whether profile is complete (Name, Age, Gender)
    const hasValidName =
      Boolean(profile?.name) &&
      profile!.name!.trim().length > 0 &&
      profile!.name !== "Mobile User";
    const hasValidAge = profile?.age !== null && profile?.age !== undefined && profile.age > 0;
    const hasValidGender =
      Boolean(profile?.gender) && profile!.gender!.trim().length > 0;

    const isProfileComplete = !isNewUser && hasValidName && hasValidAge && hasValidGender;
    const hasPreferences = Boolean(preferences?.interests && preferences.interests.length > 0);

    // Build session data for the cookie JWT
    const sessionData = {
      session: {
        id: sessionId,
        userId,
        expiresAt: sessionExpiresAt.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        token: sessionToken,
      },
      user: {
        id: userId,
        name: hasValidName ? profile?.name : "Mobile User",
        email: phoneEmail,
        emailVerified: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    };

    const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET!;
    const expSeconds = Math.floor(sessionExpiresAt.getTime() / 1000);
    const sessionDataJWT = createSessionDataJWT(sessionData, cookieSecret, expSeconds);

    const response = NextResponse.json({
      success: true,
      userId,
      isProfileComplete,
      hasPreferences,
      userName: hasValidName ? profile?.name : null,
      message: "Authentication successful",
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
    });

    response.cookies.set(SESSION_DATA_COOKIE_NAME, sessionDataJWT, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 300,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to verify code. Please try again.",
      },
      { status: 500 }
    );
  }
}
