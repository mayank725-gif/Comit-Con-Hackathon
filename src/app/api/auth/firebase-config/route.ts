import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        { success: false, error: "apiKey and projectId are required" },
        { status: 400 }
      );
    }

    const envPath = path.join(process.cwd(), ".env.local");
    let currentEnv = "";
    if (fs.existsSync(envPath)) {
      currentEnv = fs.readFileSync(envPath, "utf-8");
    }

    // Update or append Firebase environment variables
    const newConfigs: Record<string, string> = {
      NEXT_PUBLIC_FIREBASE_API_KEY: apiKey,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: authDomain || `${projectId}.firebaseapp.com`,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: storageBucket || `${projectId}.firebasestorage.app`,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: messagingSenderId || "",
      NEXT_PUBLIC_FIREBASE_APP_ID: appId || "",
      NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: measurementId || "",
    };

    let updatedEnv = currentEnv;
    for (const [key, val] of Object.entries(newConfigs)) {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(updatedEnv)) {
        updatedEnv = updatedEnv.replace(regex, `${key}="${val}"`);
      } else {
        updatedEnv += `\n${key}="${val}"`;
      }
    }

    fs.writeFileSync(envPath, updatedEnv.trim() + "\n", "utf-8");

    return NextResponse.json({
      success: true,
      message: "Firebase & Firestore configuration keys saved successfully",
      isConfigured: true,
      projectId,
    });
  } catch (err: any) {
    console.error("Firebase config save error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to save Firebase keys" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );

  return NextResponse.json({
    success: true,
    isConfigured,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || null,
  });
}
