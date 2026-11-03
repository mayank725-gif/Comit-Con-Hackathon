import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token");
    const cookieHeader = req.headers.get("cookie") || "";
    const cookieMatch = cookieHeader.match(/driver_session=([^;]+)/);
    const token = tokenFromQuery || (cookieMatch ? cookieMatch[1] : null);

    if (!token) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        profile: null,
        sectorTelemetry: null,
      });
    }

    const session = await driverDb.getSession(token);
    if (!session) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        user: null,
        profile: null,
        sectorTelemetry: null,
      });
    }

    const user = await driverDb.findUserById(session.userId);
    const profile = await driverDb.getProfile(session.userId);
    const sectorTelemetry = profile
      ? driverDb.getSectorTelemetry(profile.city, profile.primaryZone)
      : null;

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
      profile,
      sectorTelemetry,
    });
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED" || err?.message?.includes("NEXT_PRERENDER_INTERRUPTED")) {
      throw err;
    }
    console.error("Auth Me Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to retrieve user" },
      { status: 500 }
    );
  }
}
