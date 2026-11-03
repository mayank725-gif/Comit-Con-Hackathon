import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";

export async function GET() {
  try {
    const stats = driverDb.getDatabaseStats();
    const zones = driverDb.getZones();
    const drivers = driverDb.getDrivers();
    const recentRides = driverDb.getRides();
    const recentSurge = driverDb.getSurgeRequests(10);

    return NextResponse.json({
      success: true,
      database: {
        ...stats,
        collections: {
          zonesCount: Object.keys(zones).length,
          driversCount: drivers.length,
          ridesCount: recentRides.length,
          surgeCount: recentSurge.length,
        },
        sampleDrivers: drivers.slice(0, 4),
        recentRides: recentRides.slice(0, 5),
        recentSurge: recentSurge.slice(0, 5),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch database telemetry" },
      { status: 500 }
    );
  }
}
