// Predictive Surge & Proactive Repositioning Engine
// Forecasts supply-demand imbalances 15-30 minutes in advance
// Inspired by Uber Michelangelo Spatial-Temporal Machine Learning Models

import { PredictiveSurgeHotspot } from "./types";

export const PREDICTIVE_SURGE_RADAR_DATA: PredictiveSurgeHotspot[] = [
  {
    id: "SURGE_PRED_BLR_STADIUM",
    zoneName: "M. Chinnaswamy Stadium (Gate 3 & Cubbon Park)",
    city: "Bengaluru",
    coords: [12.9788, 77.5996],
    predictedSurge: 3.4,
    timeToPeakMin: 14,
    confidenceScore: 96,
    catalyst: "🏏 IPL Match Stumps: 38,000 Spectators Exiting",
    earningsBoostPercent: 55,
    recommendedBearingDeg: 42,
    surgeStatus: "FORMING",
  },
  {
    id: "SURGE_PRED_DEL_AIRPORT",
    zoneName: "Indira Gandhi Int'l Airport (T3 Arrival Boulevard)",
    city: "Delhi NCR",
    coords: [28.5562, 77.1000],
    predictedSurge: 2.8,
    timeToPeakMin: 22,
    confidenceScore: 92,
    catalyst: "✈️ T3 Arrival Wave: 14 Domestic Flights Landing Simultaneously",
    earningsBoostPercent: 40,
    recommendedBearingDeg: 260,
    surgeStatus: "FORMING",
  },
  {
    id: "SURGE_PRED_MUM_BKC",
    zoneName: "Bandra Kurla Complex (Diamond Bourse & Jio World)",
    city: "Mumbai",
    coords: [19.0657, 72.8688],
    predictedSurge: 3.1,
    timeToPeakMin: 9,
    confidenceScore: 94,
    catalyst: "🌧️ Monsoon Rain Doppler Alert + Corporate Shift Exodus",
    earningsBoostPercent: 50,
    recommendedBearingDeg: 185,
    surgeStatus: "PEAKING",
  },
  {
    id: "SURGE_PRED_BLR_BELLANDUR",
    zoneName: "Bellandur Outer Ring Road Tech Corridor",
    city: "Bengaluru",
    coords: [12.9260, 77.6762],
    predictedSurge: 2.6,
    timeToPeakMin: 18,
    confidenceScore: 89,
    catalyst: "🏢 Tech Park Shift Close: High Airport & Whitefield Transit Demand",
    earningsBoostPercent: 35,
    recommendedBearingDeg: 120,
    surgeStatus: "FORMING",
  },
  {
    id: "SURGE_PRED_HYD_HITEC",
    zoneName: "HITEC City & Cyber Towers Hub",
    city: "Hyderabad",
    coords: [17.4474, 78.3762],
    predictedSurge: 2.7,
    timeToPeakMin: 25,
    confidenceScore: 91,
    catalyst: "💼 Global Summit Concludes at Novotel HICC",
    earningsBoostPercent: 38,
    recommendedBearingDeg: 310,
    surgeStatus: "FORMING",
  },
  {
    id: "SURGE_PRED_GURGAON_CYBERHUB",
    zoneName: "DLF Cyber Hub & Phase 2",
    city: "Delhi NCR",
    coords: [28.4950, 77.0895],
    predictedSurge: 3.0,
    timeToPeakMin: 12,
    confidenceScore: 93,
    catalyst: "🎉 Friday Evening Dining & Metro Line Yellow Bottleneck",
    earningsBoostPercent: 48,
    recommendedBearingDeg: 215,
    surgeStatus: "PEAKING",
  },
];

export class PredictiveSurgeEngine {
  // Returns currently forming and peaking hotspots
  getLiveHotspots(cityFilter?: string): PredictiveSurgeHotspot[] {
    if (!cityFilter || cityFilter === "ALL" || cityFilter === "INDIA") {
      return PREDICTIVE_SURGE_RADAR_DATA;
    }
    return PREDICTIVE_SURGE_RADAR_DATA.filter(
      (h) => h.city.toLowerCase().includes(cityFilter.toLowerCase())
    );
  }

  // Calculates ETA and estimated extra revenue if driver repositions now
  calculateRepositionBenefit(
    driverCoords: [number, number],
    hotspot: PredictiveSurgeHotspot
  ) {
    // Haversine distance in km
    const [lat1, lon1] = driverCoords;
    const [lat2, lon2] = hotspot.coords;
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = Math.max(0.8, +(R * c).toFixed(1));

    // Approximate travel time assuming 35 km/h city average
    const etaMin = Math.max(3, Math.round((distanceKm / 35) * 60));

    // Time cushion: will driver arrive before surge peaks?
    const arriveBeforePeak = etaMin <= hotspot.timeToPeakMin;
    const estimatedExtraInr = Math.round(
      (hotspot.predictedSurge - 1.0) * 160 + distanceKm * 8
    );

    return {
      distanceKm,
      etaMin,
      arriveBeforePeak,
      estimatedExtraInr,
      recommendation: arriveBeforePeak
        ? `🔥 High Advantage: Arrive in ~${etaMin}m to catch full ${hotspot.predictedSurge}x surge peak!`
        : `⚠️ Moderate Advantage: Peak starts in ${hotspot.timeToPeakMin}m; position now to catch residual high-demand wave.`,
    };
  }
}

export const predictiveEngine = new PredictiveSurgeEngine();
