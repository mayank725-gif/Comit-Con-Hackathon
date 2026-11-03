import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";
import { RideRequest } from "@/lib/uber/types";

export async function GET() {
  try {
    const rides = driverDb.getRides();
    return NextResponse.json({ success: true, rides });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body: RideRequest = await req.json();
    if (!body || !body.pickupAddress || !body.dropoffAddress) {
      return NextResponse.json({ success: false, error: "Invalid ride payload" }, { status: 400 });
    }

    const saved = driverDb.createRideRequest(body);
    return NextResponse.json({ success: true, ride: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
