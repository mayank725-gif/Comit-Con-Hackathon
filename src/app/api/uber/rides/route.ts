import { NextResponse } from "next/server";
import { driverDb } from "@/lib/db/driverDb";
import { RideRequest } from "@/lib/uber/types";
import {
  publishRideToFirestore,
  updateRideInFirestore,
} from "@/lib/firebase/firestoreRides";
import {
  broadcastRideStatus,
  broadcastNewDispatch,
} from "@/lib/uber/liveSync";

const CLOUD_SYNC_ID = "ff808181a09d98f701a1a596be502d05";

async function syncWithCloudState(updates: any) {
  try {
    await fetch(`https://api.restful-api.dev/objects/${CLOUD_SYNC_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "UberActiveRide", data: updates }),
    });
  } catch (e) {
    // non-fatal
  }
}

async function getCloudState(): Promise<any> {
  try {
    const res = await fetch(`https://api.restful-api.dev/objects/${CLOUD_SYNC_ID}`, {
      cache: "no-store",
    });
    const json = await res.json();
    return json?.data || null;
  } catch (e) {
    return null;
  }
}

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

    let activeRide = driverDb.getLatestActiveRide();

    // Reconcile with shared cloud state across Vercel serverless containers
    try {
      const cloud = await getCloudState();
      if (cloud && cloud.rideId) {
        const found = rides.find((r) => r.id === cloud.rideId);
        if (found) {
          found.status = cloud.status;
          if (cloud.driverDetails) {
            Object.assign(found, cloud.driverDetails);
          }
        } else if (cloud.activeRide && cloud.status !== "COMPLETED" && cloud.status !== "CANCELLED") {
          rides.unshift({
            ...cloud.activeRide,
            status: cloud.status,
            ...(cloud.driverDetails || {}),
          });
        }
      }
    } catch {
      // fallback to memory
    }

    // Recompute latest active pending/accepted/in_progress ride
    activeRide = rides.find(
      (r) =>
        r.status === "REQUESTED" ||
        r.status === "PENDING" ||
        r.status === "ACCEPTED" ||
        r.status === "IN_PROGRESS"
    ) || null;

    return NextResponse.json({ success: true, rides, activeRide });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// POST /api/uber/rides - Rider creates new ride request (Triply synced: Custom DB + LiveSync + Cloud Firestore)
export async function POST(req: Request) {
  try {
    const body: RideRequest = await req.json();
    if (!body || !body.pickupAddress || !body.dropoffAddress) {
      return NextResponse.json({ success: false, error: "Invalid ride payload" }, { status: 400 });
    }

    const ridePayload: RideRequest = {
      ...body,
      id: body.id || `RIDE-${Date.now().toString().slice(-6)}`,
      timestamp: body.timestamp || new Date().toISOString(),
      status: body.status || "PENDING",
      otp: body.otp || `${Math.floor(1000 + Math.random() * 9000)}`,
    };

    const saved = driverDb.createRideRequest(ridePayload);

    // 1. Ultra-Low-Latency SSE Broadcast (<50ms)
    broadcastNewDispatch(ridePayload).catch(() => {});

    // 2. Cloud Firestore Real-Time WebSocket
    publishRideToFirestore(ridePayload).catch(() => {});

    // 3. Shared Global Cloud State for serverless containers
    syncWithCloudState({
      activeRide: ridePayload,
      rideId: ridePayload.id,
      status: ridePayload.status,
      timestamp: Date.now(),
    }).catch(() => {});

    return NextResponse.json({ success: true, ride: saved });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// PATCH /api/uber/rides - Driver accepts, starts, or completes the trip
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

    // If this serverless container doesn't have the ride in local memory, reconstruct it from shared cloud state
    let cloudRide: any = null;
    try {
      const currentCloud = await getCloudState();
      if (currentCloud && currentCloud.activeRide) {
        cloudRide = {
          ...currentCloud.activeRide,
          status,
          ...(driverDetails || {}),
        };
      }
    } catch {
      // ignore
    }

    const resolvedRide = updated || cloudRide || { id: rideId, status, ...(driverDetails || {}) };

    // 1. Ultra-Low-Latency SSE Broadcast (<50ms trigger to Rider Phone 1)
    broadcastRideStatus(rideId, status, driverDetails).catch(() => {});

    // 2. Cloud Firestore Real-Time WebSocket
    updateRideInFirestore(rideId, status, driverDetails).catch(() => {});

    const isFinished = status === "CANCELLED" || status === "COMPLETED";

    // 3. Shared Global Cloud State for serverless containers
    syncWithCloudState({
      rideId: isFinished ? null : rideId,
      status,
      driverDetails: driverDetails || null,
      activeRide: isFinished ? null : resolvedRide,
      updatedAt: Date.now(),
    }).catch(() => {});

    return NextResponse.json({ success: true, ride: resolvedRide });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}

// DELETE /api/uber/rides - Reset active trips for a clean demo presentation
export async function DELETE() {
  try {
    driverDb.clearAllActiveRides();
    syncWithCloudState({ rideId: null, status: "COMPLETED", activeRide: null }).catch(() => {});
    return NextResponse.json({ success: true, message: "Active rides cleared" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
