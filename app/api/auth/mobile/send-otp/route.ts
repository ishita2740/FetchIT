import { NextResponse } from "next/server";
import { getTwilioClient, getVerifyServiceSid } from "@/lib/twilio";
import { normalizeIndianPhoneNumber } from "@/lib/phone";

/**
 * POST /api/auth/mobile/send-otp
 *
 * Sends a real SMS verification code using Twilio Verify v2.
 * Does not generate, log, or store OTPs locally.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPhone = body.phone || body.phoneNumber;

    if (!rawPhone || typeof rawPhone !== "string") {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid 10-digit Indian mobile number.",
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

    const client = getTwilioClient();
    const serviceSid = getVerifyServiceSid();

    await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: normalizedPhone,
        channel: "sms",
      });

    return NextResponse.json({
      success: true,
      message: "Verification code sent",
    });
  } catch (error: any) {
    // Map Twilio-specific error codes to user-friendly messages without exposing secrets or stack traces
    const twilioCode = error?.code;
    let userMessage = "Could not send OTP. Please try again.";
    let statusCode = 500;

    if (twilioCode === 21608) {
      userMessage =
        "This phone number is not verified on this trial account. Please use a verified phone number.";
      statusCode = 400;
    } else if (twilioCode === 60203 || error?.status === 429) {
      userMessage = "Too many attempts. Please wait a moment and try again.";
      statusCode = 429;
    } else if (twilioCode === 21211 || twilioCode === 21614) {
      userMessage = "Please enter a valid 10-digit Indian mobile number.";
      statusCode = 400;
    } else if (twilioCode === 20003) {
      userMessage = "Authentication service temporarily unavailable. Please try again later.";
      statusCode = 503;
    }

    return NextResponse.json(
      {
        success: false,
        message: userMessage,
      },
      { status: statusCode }
    );
  }
}
