import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";
import { RideRequest } from "@/lib/uber/types";

// GET /api/uber/rides - Fetches all rides + active dispatched/pending ride for real-time polling
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rider = url.searchParams.get("rider");
    const driver = url.searchParams.get("driver");

    const rides = driver
      ? driverDb.getDriverRides(driver)
      : rider
      ? driverDb.getRiderRides(rider)
      : driverDb.getRides();

    const activeRide = driverDb.getLatestActiveRide();
    return NextResponse.json({ success: true, rides, activeRide });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// POST /api/uber/rides - Rider on Phone 1 creates a new ride request
export async function POST(req: Request) {
  try {
    const body: RideRequest = await req.json();
    if (!body || !body.pickupAddress || !body.dropoffAddress) {
      return NextResponse.json({ success: false, error: "Invalid ride payload" }, { status: 400 });
    }

    // Ensure status is REQUESTED/PENDING and timestamp is set
    const ridePayload: RideRequest = {
      ...body,
      id: body.id || `RIDE-${Date.now().toString().slice(-6)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      status: body.status || "PENDING",
      otp: body.otp || `${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const saved = driverDb.createRideRequest(ridePayload);
    return NextResponse.json({ success: true, ride: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// PATCH /api/uber/rides - Driver on Phone 2 accepts, starts, or completes the trip
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { rideId, status, driverDetails } = body;

    if (!rideId || !status) {
      return NextResponse.json(
        { success: false, error: "rideId and status are required" },
        { status: 400 }
      );
    }

    const updated = driverDb.updateRideStatus(rideId, status, driverDetails);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Ride request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ride: updated });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// DELETE /api/uber/rides - Reset active trips for a clean demo presentation
export async function DELETE() {
  try {
    driverDb.clearAllActiveRides();
    return NextResponse.json({ success: true, message: "Active rides cleared" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
