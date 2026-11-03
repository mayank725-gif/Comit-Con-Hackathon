import { NextResponse } from "next/server";
import { VehicleType } from "@/lib/uber/types";

interface SmartRouteRequest {
  pickupCoords: [number, number];
  dropoffCoords: [number, number];
  pickupName: string;
  dropoffName: string;
  vehicleType: VehicleType;
  currentSurgeMultiplier?: number;
}

// Calculate Haversine Distance in Kilometers
function calculateHaversineDistance(
  [lat1, lon1]: [number, number],
  [lat2, lon2]: [number, number]
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.max(1.5, +d.toFixed(1));
}

// Generate smooth arterial waypoints between two coordinates
function generateWaypoints(
  start: [number, number],
  end: [number, number]
): [number, number][] {
  const points: [number, number][] = [start];
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const fraction = i / steps;
    // Add realistic road curve perturbation
    const curveOffset = Math.sin(fraction * Math.PI) * 0.008;
    const lat = start[0] + (end[0] - start[0]) * fraction + curveOffset;
    const lng = start[1] + (end[1] - start[1]) * fraction - curveOffset * 0.5;
    points.push([+lat.toFixed(6), +lng.toFixed(6)]);
  }
  points.push(end);
  return points;
}

export async function POST(req: Request) {
  try {
    const body: SmartRouteRequest = await req.json();
    const {
      pickupCoords,
      dropoffCoords,
      pickupName,
      dropoffName,
      vehicleType = "UBER_GO",
      currentSurgeMultiplier = 1.0,
    } = body;

    if (!pickupCoords || !dropoffCoords) {
      return NextResponse.json(
        { success: false, error: "Missing pickup or dropoff coordinates" },
        { status: 400 }
      );
    }

    // 1. Backend Haversine Road Mesh Routing
    const distanceKm = calculateHaversineDistance(pickupCoords, dropoffCoords);

    // 2. Base Rates & Surge Matrix
    const RATES: Record<VehicleType, { base: number; perKm: number; minFare: number; avgSpeedKmh: number }> = {
      UBER_GO: { base: 45, perKm: 13.5, minFare: 80, avgSpeedKmh: 36 },
      UBER_PREMIER: { base: 75, perKm: 21.0, minFare: 140, avgSpeedKmh: 40 },
      UBER_AUTO: { base: 30, perKm: 10.0, minFare: 50, avgSpeedKmh: 28 },
      UBER_GREEN_EV: { base: 50, perKm: 15.0, minFare: 90, avgSpeedKmh: 35 },
    };

    const rate = RATES[vehicleType] || RATES.UBER_GO;
    const baseFare = Math.round(rate.base + distanceKm * rate.perKm);
    const effectiveSurge = Math.max(1.0, currentSurgeMultiplier);
    const surgeBonusInr = Math.round(baseFare * (effectiveSurge - 1.0));
    const finalFareInr = Math.max(rate.minFare, baseFare + surgeBonusInr);

    // 3. Traffic-Adjusted Travel Time
    const travelTimeMin = Math.max(6, Math.round((distanceKm / rate.avgSpeedKmh) * 60 + 4));
    const pickupEtaMin = Math.floor(Math.random() * 3) + 3;

    // 4. Generate Waypoints
    const routeCoordinates = generateWaypoints(pickupCoords, dropoffCoords);

    return NextResponse.json({
      success: true,
      smartRouting: {
        distanceKm,
        travelTimeMin,
        pickupEtaMin,
        baseFareInr: baseFare,
        surgeBonusInr,
        finalFareInr,
        surgeMultiplier: effectiveSurge,
        vehicleType,
        pickupName,
        dropoffName,
        routeCoordinates,
        routingAlgorithm: "MICHELANGELO_DYNAMIC_MESH_V4",
      },
    });
  } catch (error: any) {
    console.error("Smart routing engine error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Backend routing failed" },
      { status: 500 }
    );
  }
}
