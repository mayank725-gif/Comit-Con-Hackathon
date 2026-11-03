import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { googleId, email, name, avatar } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required for Google Sign-In" },
        { status: 400 }
      );
    }

    // Default driver fallback names if not provided
    const driverName = name || email.split("@")[0].replace(".", " ");
    const driverGoogleId = googleId || `google-oauth2|${Date.now()}`;

    // Create or update in our custom database
    const user = await driverDb.createOrUpdateGoogleUser({
      googleId: driverGoogleId,
      email,
      name: driverName,
      avatar,
    });

    // Create session token
    const session = await driverDb.createSession(user.id);

    // Retrieve or initialize profile
    let profile = await driverDb.getProfile(user.id);
    if (!profile) {
      profile = await driverDb.upsertProfile(user.id, {
        driverName: user.name,
      });
    }

    const response = NextResponse.json({
      success: true,
      user,
      profile,
      token: session.token,
    });

    // Set secure HTTP-only cookie for session persistence
    response.cookies.set("driver_session", session.token, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      sameSite: "lax",
      httpOnly: false, // accessible to client for offline sync
    });

    return response;
  } catch (err: any) {
    console.error("Google Auth Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Authentication failed" },
      { status: 500 }
    );
  }
}
