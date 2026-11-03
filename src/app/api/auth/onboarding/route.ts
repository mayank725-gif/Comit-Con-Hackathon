import { NextResponse } from "next/server";
import { driverDb, DriverWorkProfile } from "@/lib/db/driverDb";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, ...profileUpdates } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required for updating work profile" },
        { status: 400 }
      );
    }

    const updated = await driverDb.upsertProfile(userId, profileUpdates);
    const sectorTelemetry = driverDb.getSectorTelemetry(updated.city, updated.primaryZone);

    return NextResponse.json({
      success: true,
      profile: updated,
      sectorTelemetry,
      message: "Driver operating territory and vehicle profile updated successfully",
    });
  } catch (err: any) {
    console.error("Onboarding Error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
