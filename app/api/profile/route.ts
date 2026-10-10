import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import {
  getUserProfileByAuthId,
  upsertUserProfile,
  getUserPreferences,
  upsertUserPreferences,
} from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUserId = sessionUser.id;
    let profile = await getUserProfileByAuthId(authUserId);

    // If profile does not exist yet, create an initial one with info from auth session
    if (!profile) {
      profile = await upsertUserProfile({
        auth_user_id: authUserId,
        email: sessionUser.email || null,
        name: sessionUser.name || null,
      });
    }

    const preferences = profile ? await getUserPreferences(profile.id) : null;

    return NextResponse.json({
      user: { id: sessionUser.id, email: sessionUser.email, name: sessionUser.name },
      profile,
      preferences,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUserId = sessionUser.id;
    const body = await request.json();

    const {
      name,
      email,
      phone,
      age,
      gender,
      language,
      interests,
      information_purpose,
      information_style,
      information_priorities,
    } = body;

    const profile = await upsertUserProfile({
      auth_user_id: authUserId,
      name: name ?? sessionUser.name,
      email: email ?? sessionUser.email,
      phone,
      age: age ? Number(age) : null,
      gender,
      language,
    });

    let preferences = null;
    if (
      interests !== undefined ||
      information_purpose !== undefined ||
      information_style !== undefined ||
      information_priorities !== undefined
    ) {
      preferences = await upsertUserPreferences({
        user_profile_id: profile.id,
        interests,
        information_purpose,
        information_style,
        information_priorities,
      });
    } else {
      preferences = await getUserPreferences(profile.id);
    }

    return NextResponse.json({
      success: true,
      profile,
      preferences,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
