// Autonomous Safety Sentinel & Route Divergence Anomaly Detection
// Monitors GPS cross-track deviation, unexpected detours, and silent distress signals

import { RouteAnomalyAlert, RideRequest } from "./types";
import { uberAudio } from "./soundEffects";

export class SafetySentinelEngine {
  // Cross-track distance formula between point (lat, lng) and line segment (lat1,lng1)-(lat2,lng2)
  private pointToLineSegmentDistanceMeters(
    p: [number, number],
    a: [number, number],
    b: [number, number]
  ): number {
    const [pLat, pLng] = p;
    const [aLat, aLng] = a;
    const [bLat, bLng] = b;

    // Convert to planar approximation around the latitude
    const degToMeters = 111320;
    const cosLat = Math.cos((pLat * Math.PI) / 180);

    const px = (pLng - aLng) * cosLat * degToMeters;
    const py = (pLat - aLat) * degToMeters;
    const bx = (bLng - aLng) * cosLat * degToMeters;
    const by = (bLat - aLat) * degToMeters;

    const segmentLenSq = bx * bx + by * by;
    if (segmentLenSq === 0) {
      return Math.sqrt(px * px + py * py);
    }

    // Projection factor t on line segment [0, 1]
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / segmentLenSq));
    const projX = t * bx;
    const projY = t * by;

    const dx = px - projX;
    const dy = py - projY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Analyzes current vehicle location against the designated trip route coordinates
  evaluateRouteDeviation(
    currentCoords: [number, number],
    routeCoords: [number, number][]
  ): { deviationMeters: number; isAnomalous: boolean } {
    if (!routeCoords || routeCoords.length < 2) {
      return { deviationMeters: 0, isAnomalous: false };
    }

    let minDistanceMeters = Infinity;

    for (let i = 0; i < routeCoords.length - 1; i++) {
      const segStart = routeCoords[i];
      const segEnd = routeCoords[i + 1];
      const dist = this.pointToLineSegmentDistanceMeters(
        currentCoords,
        segStart,
        segEnd
      );
      if (dist < minDistanceMeters) {
        minDistanceMeters = dist;
      }
    }

    const roundedDeviation = Math.round(minDistanceMeters);
    // Threshold: > 350 meters is marked as route divergence
    const isAnomalous = roundedDeviation > 350;

    return {
      deviationMeters: roundedDeviation,
      isAnomalous,
    };
  }

  // Creates an anomaly alert record
  createAnomalyAlert(
    tripId: string,
    type: RouteAnomalyAlert["type"],
    deviationMeters: number,
    location: [number, number]
  ): RouteAnomalyAlert {
    uberAudio.playSafetyAlertTone();

    const messages = {
      ROUTE_DIVERGENCE: `⚠️ Route Divergence Detected: Vehicle is ${deviationMeters}m off planned route corridor. Checking passenger and driver status.`,
      PROLONGED_STOP: `⚠️ Prolonged Stationary Stop: Vehicle halted for > 3 minutes outside planned dropoff point.`,
      UNSCHEDULED_DETOUR: `⚠️ Unscheduled Detour: Vehicle moving away from destination.`,
      SILENT_SOS: `🚨 EMERGENCY SILENT SOS TRIGGERED: Security dispatch alerted and GPS coordinates shared with emergency response.`,
    };

    return {
      id: `ANOMALY_${Date.now()}_${Math.floor(Math.random() * 9000)}`,
      tripId,
      type,
      severity: type === "SILENT_SOS" ? "CRITICAL" : deviationMeters > 700 ? "HIGH" : "MEDIUM",
      deviationMeters,
      divergenceLocation: location,
      status: type === "SILENT_SOS" ? "ESCALATED_DISPATCH" : "ACTIVE_CHECK",
      timestamp: new Date().toISOString(),
      audioPrompt: messages[type],
    };
  }
}

export const safetySentinel = new SafetySentinelEngine();
