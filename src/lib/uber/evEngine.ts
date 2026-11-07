// Electric Vehicle (EV) Telemetry, Smart Dispatch & Charging Hub Engine
// Zero-emission fleet management and carbon offset calculations

import { EVChargingStation, EVTelemetry, VehicleType } from "./types";

export const VERIFIED_EV_CHARGING_HUBS: EVChargingStation[] = [
  // Bengaluru
  {
    id: "CHG_BLR_INDIRANAGAR",
    name: "Tata Power EZ Charge - Indiranagar Club Hub",
    provider: "TATA_POWER_EZ",
    city: "Bengaluru",
    coords: [12.9784, 77.6408],
    powerKw: 60,
    availableStalls: 3,
    totalStalls: 4,
    costPerKwh: 18.5,
    distanceKm: 2.4,
    connectorType: "CCS2 / Type 2",
  },
  {
    id: "CHG_BLR_AIRPORT",
    name: "Statiq Ultra Fast Hub - BLR Airport Toll Plaza",
    provider: "STATIQ",
    city: "Bengaluru",
    coords: [13.1850, 77.7020],
    powerKw: 120,
    availableStalls: 5,
    totalStalls: 6,
    costPerKwh: 21.0,
    distanceKm: 8.6,
    connectorType: "CCS2 / Type 2",
  },
  {
    id: "CHG_BLR_KORAMANGALA",
    name: "Jio-bp Pulse - Forum South Koramangala",
    provider: "JIO_BP_PULSE",
    city: "Bengaluru",
    coords: [12.9352, 77.6245],
    powerKw: 50,
    availableStalls: 2,
    totalStalls: 4,
    costPerKwh: 17.0,
    distanceKm: 4.1,
    connectorType: "CCS2 / Type 2",
  },
  // Delhi NCR
  {
    id: "CHG_DEL_AEROCITY",
    name: "Tata Power EZ Charge - Worldmark Aerocity",
    provider: "TATA_POWER_EZ",
    city: "Delhi NCR",
    coords: [28.5492, 77.1215],
    powerKw: 60,
    availableStalls: 4,
    totalStalls: 6,
    costPerKwh: 19.0,
    distanceKm: 3.2,
    connectorType: "CCS2 / Type 2",
  },
  {
    id: "CHG_DEL_CYBERHUB",
    name: "Statiq Mega EV Hub - DLF CyberCity Gate 2",
    provider: "STATIQ",
    city: "Delhi NCR",
    coords: [28.4950, 77.0895],
    powerKw: 120,
    availableStalls: 7,
    totalStalls: 8,
    costPerKwh: 20.5,
    distanceKm: 1.8,
    connectorType: "CCS2 / Type 2",
  },
  // Mumbai
  {
    id: "CHG_MUM_BKC",
    name: "Jio-bp Pulse - BKC G-Block Fast Hub",
    provider: "JIO_BP_PULSE",
    city: "Mumbai",
    coords: [19.0657, 72.8688],
    powerKw: 60,
    availableStalls: 4,
    totalStalls: 6,
    costPerKwh: 19.5,
    distanceKm: 1.5,
    connectorType: "CCS2 / Type 2",
  },
  // Hyderabad
  {
    id: "CHG_HYD_HITEC",
    name: "Tata Power EZ Charge - Mindspace Cyberabad",
    provider: "TATA_POWER_EZ",
    city: "Hyderabad",
    coords: [17.4474, 78.3762],
    powerKw: 60,
    availableStalls: 3,
    totalStalls: 4,
    costPerKwh: 18.0,
    distanceKm: 2.1,
    connectorType: "CCS2 / Type 2",
  },
];

export class EVEngine {
  // Baseline: Average ICE car emits ~140g CO2 per km. EV emission is ~35g/km (grid avg).
  // Net CO2 saved per km in India = 105 grams = 0.105 kg/km.
  calculateCarbonSavingsKg(distanceKm: number, vehicleType: VehicleType): number {
    if (vehicleType === "UBER_GREEN_EV") {
      return +(distanceKm * 0.105).toFixed(2);
    }
    // Shared / Pooled efficiency bonus
    return +(distanceKm * 0.035).toFixed(2);
  }

  // Evaluates whether an EV vehicle is safe to accept a trip
  evaluateBatterySafety(
    socPercent: number,
    tripDistanceKm: number
  ): {
    canAccept: boolean;
    remainingRangeKm: number;
    reason?: string;
  } {
    // Standard EV efficiency: ~3.2 km per 1% SoC (e.g. Tata Nexon EV / Tigor EV 300km range)
    const remainingRangeKm = Math.round(socPercent * 3.0);
    const safetyBufferKm = 15; // Reserve to reach charging station

    if (socPercent < 15) {
      return {
        canAccept: false,
        remainingRangeKm,
        reason: "🚨 Critical Battery (< 15%): Driver must route to a fast charger immediately.",
      };
    }

    if (tripDistanceKm + safetyBufferKm > remainingRangeKm) {
      return {
        canAccept: false,
        remainingRangeKm,
        reason: `⚠️ Insufficient Range: Trip is ${tripDistanceKm} km, but safe range with buffer is ${remainingRangeKm - safetyBufferKm} km.`,
      };
    }

    return {
      canAccept: true,
      remainingRangeKm,
    };
  }

  // Find nearest charging stations given driver coords
  getNearestStations(
    driverCoords: [number, number],
    cityFilter?: string
  ): EVChargingStation[] {
    const [lat1, lon1] = driverCoords;

    const list = cityFilter && cityFilter !== "ALL"
      ? VERIFIED_EV_CHARGING_HUBS.filter((s) =>
          s.city.toLowerCase().includes(cityFilter.toLowerCase())
        )
      : VERIFIED_EV_CHARGING_HUBS;

    return list
      .map((station) => {
        const [lat2, lon2] = station.coords;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distanceKm = Math.max(0.5, +(6371 * c).toFixed(1));
        return {
          ...station,
          distanceKm,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
}

export const evEngine = new EVEngine();
