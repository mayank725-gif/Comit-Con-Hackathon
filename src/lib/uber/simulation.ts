import {
  ZoneId,
  CityZone,
  Driver,
  MarketplaceState,
  ScenarioEvent,
  ModelHealth,
} from "./types";

export class UberMarketplaceEngine {
  private state: MarketplaceState;

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): MarketplaceState {
    // Real Coordinates for Bengaluru (India's Tech Capital)
    const zones: Record<ZoneId, CityZone> = {
      STADIUM: {
        id: "STADIUM",
        name: "M. Chinnaswamy Stadium (Cricket & Arena)",
        lat: 12.9788,
        lng: 77.5996,
        radiusMeters: 1400,
        currentDemand: 50,
        activeDrivers: 15,
        surgeMultiplier: 1.0,
        predictedDemand15m: 65,
        deficitOrSurplus: 50,
        status: "NORMAL",
      },
      DOWNTOWN: {
        id: "DOWNTOWN",
        name: "MG Road & Central Business District (CBD)",
        lat: 12.9756,
        lng: 77.6097,
        radiusMeters: 1600,
        currentDemand: 120,
        activeDrivers: 34,
        surgeMultiplier: 1.2,
        predictedDemand15m: 135,
        deficitOrSurplus: 101,
        status: "NORMAL",
      },
      AIRPORT: {
        id: "AIRPORT",
        name: "Kempegowda International Airport (BLR Hub)",
        lat: 13.1986,
        lng: 77.7066,
        radiusMeters: 2400,
        currentDemand: 85,
        activeDrivers: 25,
        surgeMultiplier: 1.1,
        predictedDemand15m: 100,
        deficitOrSurplus: 75,
        status: "NORMAL",
      },
      TECH_PARK: {
        id: "TECH_PARK",
        name: "Outer Ring Road & Bellandur Tech Corridor",
        lat: 12.9260,
        lng: 77.6762,
        radiusMeters: 1800,
        currentDemand: 95,
        activeDrivers: 28,
        surgeMultiplier: 1.3,
        predictedDemand15m: 115,
        deficitOrSurplus: 87,
        status: "NORMAL",
      },
      ENTERTAINMENT: {
        id: "ENTERTAINMENT",
        name: "Koramangala & Indiranagar Nightlife Hub",
        lat: 12.9352,
        lng: 77.6245,
        radiusMeters: 1500,
        currentDemand: 105,
        activeDrivers: 30,
        surgeMultiplier: 1.2,
        predictedDemand15m: 120,
        deficitOrSurplus: 90,
        status: "NORMAL",
      },
    };

    const drivers: Driver[] = this.seedDrivers(zones);

    const activeScenario: ScenarioEvent = {
      type: "NORMAL",
      title: "Nominal Marketplace Operations (Bengaluru Metro)",
      description: "Equilibrium dispatch across all 5 municipal sectors. P99 model inference latency at 8.4ms.",
      active: true,
      timestamp: new Date().toISOString(),
    };

    const modelHealth: ModelHealth = {
      status: "HEALTHY",
      latencyMs: 8.4,
      featureDriftScore: 0.08,
      lastRecalibrated: new Date().toISOString(),
      activeRoutingAlgorithm: "MICHELANGELO_ML",
    };

    return {
      step: 1,
      zones,
      drivers,
      activeScenario,
      modelHealth,
      metrics: {
        cityAvgSurge: 1.16,
        avgRiderWaitTimeMin: 7.2,
        avgDriverHourlyRate: 460, // ₹460/hr
        unfulfilledRequests: 18,
        totalTripsActive: 42,
        antiHerdDampingActive: false,
      },
    };
  }

  private seedDrivers(zones: Record<ZoneId, CityZone>): Driver[] {
    const driverNames = [
      "Ramesh K.", "Suresh M.", "Priya N.", "Amit S.", "Vikram R.",
      "Arjun P.", "Ananya G.", "Deepak L.", "Kavita B.", "Rajesh O.",
      "Manoj H.", "Kiran D.", "Sunil V.", "Pooja B.", "Tariq A.",
      "Santosh F.", "Neha M.", "Ravi P.", "Gaurav K.", "Naveen S.",
      "Mohan G.", "Rahul W.", "Swati C.", "Alok J.", "Harish Y."
    ];

    const zoneKeys: ZoneId[] = ["STADIUM", "DOWNTOWN", "AIRPORT", "TECH_PARK", "ENTERTAINMENT"];

    return driverNames.map((name, i) => {
      const zoneId = zoneKeys[i % zoneKeys.length];
      const baseZone = zones[zoneId];
      // Random geographic jitter within ~1km in Bengaluru
      const lat = baseZone.lat + (Math.random() - 0.5) * 0.018;
      const lng = baseZone.lng + (Math.random() - 0.5) * 0.018;

      return {
        id: `DRV_${100 + i}`,
        name,
        currentZone: zoneId,
        status: (i % 3 === 0 ? "ON_TRIP" : i % 3 === 1 ? "IDLE" : "EN_ROUTE_SURGE"),
        lat,
        lng,
        earningsToday: Math.round(1850 + Math.random() * 950), // in ₹ INR
        tripsCompleted: Math.floor(6 + Math.random() * 8),
        shiftHours: 4.5,
      };
    });
  }

  public getState(): MarketplaceState {
    return this.state;
  }

  public tick(): MarketplaceState {
    this.state.step += 1;

    // 1. Move vehicles on real Indian city coordinates
    this.state.drivers.forEach((driver) => {
      if (driver.targetZone) {
        const target = this.state.zones[driver.targetZone];
        const dLat = target.lat - driver.lat;
        const dLng = target.lng - driver.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist > 0.004) {
          driver.lat += (dLat / dist) * 0.0035;
          driver.lng += (dLng / dist) * 0.0035;
        } else {
          driver.currentZone = driver.targetZone;
          driver.targetZone = undefined;
          driver.status = "IDLE";
        }
      } else {
        // Subtle realistic street drift
        driver.lat += (Math.random() - 0.5) * 0.001;
        driver.lng += (Math.random() - 0.5) * 0.001;
      }
    });

    // 2. Count active drivers per zone
    const counts: Record<ZoneId, number> = {
      STADIUM: 0,
      DOWNTOWN: 0,
      AIRPORT: 0,
      TECH_PARK: 0,
      ENTERTAINMENT: 0,
    };

    this.state.drivers.forEach((d) => {
      counts[d.currentZone] += 1;
    });

    // 3. Recalculate Dynamic Surge and Predicted Demand
    let totalSurge = 0;
    let totalWait = 0;
    let zoneCount = 0;

    for (const [id, zone] of Object.entries(this.state.zones)) {
      const zId = id as ZoneId;
      zone.activeDrivers = counts[zId] || 1;

      const ratio = zone.currentDemand / Math.max(1, zone.activeDrivers);
      let calculatedSurge = 1.0;
      if (ratio > 1.2) {
        calculatedSurge = Math.min(3.5, 1.0 + (ratio - 1.2) * 0.6);
      }
      zone.surgeMultiplier = Math.round(calculatedSurge * 10) / 10;
      zone.deficitOrSurplus = Math.max(0, zone.predictedDemand15m - zone.activeDrivers);

      totalSurge += zone.surgeMultiplier;
      totalWait += Math.max(3, Math.round(zone.surgeMultiplier * 3.5));
      zoneCount++;
    }

    this.state.metrics.cityAvgSurge = Math.round((totalSurge / zoneCount) * 10) / 10;
    this.state.metrics.avgRiderWaitTimeMin = Math.round((totalWait / zoneCount) * 10) / 10;

    // 4. Auto-recover from Stale Model Drift if active
    if (this.state.modelHealth.status === "FALLBACK_ENGAGED") {
      this.state.modelHealth.featureDriftScore = Math.max(
        0.05,
        this.state.modelHealth.featureDriftScore - 0.15
      );
      if (this.state.modelHealth.featureDriftScore <= 0.15) {
        this.state.modelHealth.status = "HEALTHY";
        this.state.modelHealth.activeRoutingAlgorithm = "MICHELANGELO_ML";
        this.state.modelHealth.lastRecalibrated = new Date().toISOString();
      }
    }

    return this.state;
  }

  public triggerScenario(
    type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "RESET"
  ): MarketplaceState {
    if (type === "RESET") {
      this.state = this.getInitialState();
      return this.state;
    }

    if (type === "STADIUM_CONCERT_END") {
      this.state.activeScenario = {
        type: "STADIUM_CONCERT_END",
        title: "IPL T20 Match Concludes at M. Chinnaswamy Stadium (40,000 Spectators)",
        description: "Massive egress surge along Cubbon Park & MG Road: Demand spiked to 490 requests against 15 active vehicles.",
        affectedZone: "STADIUM",
        active: true,
        timestamp: new Date().toISOString(),
      };

      const stadium = this.state.zones.STADIUM;
      stadium.currentDemand = 490;
      stadium.predictedDemand15m = 560;
      stadium.surgeMultiplier = 3.5;
      stadium.status = "HIGH_SURGE";

      // Dispatched drivers start driving on map toward Stadium coordinates
      let dispatched = 0;
      this.state.drivers.forEach((driver) => {
        if (driver.status === "IDLE" && driver.currentZone !== "STADIUM" && dispatched < 10) {
          driver.targetZone = "STADIUM";
          driver.status = "EN_ROUTE_SURGE";
          dispatched++;
        }
      });

      this.state.metrics.antiHerdDampingActive = true;
    }

    if (type === "STALE_MODEL_DRIFT") {
      this.state.activeScenario = {
        type: "STALE_MODEL_DRIFT",
        title: "Predictive Feature Drift Detected in ML Pipeline (Sudden Monsoon Inflow)",
        description: "Monsoon downpour created 78% deviation between historical model and ground sensor feeds. Self-Healing Fallback engaged.",
        active: true,
        timestamp: new Date().toISOString(),
      };

      this.state.modelHealth = {
        status: "FALLBACK_ENGAGED",
        latencyMs: 14.8,
        featureDriftScore: 0.78,
        lastRecalibrated: new Date().toISOString(),
        activeRoutingAlgorithm: "REALTIME_HEURISTIC_FALLBACK",
      };
    }

    if (type === "AIRPORT_FLIGHT_WAVE") {
      this.state.activeScenario = {
        type: "AIRPORT_FLIGHT_WAVE",
        title: "International Flight Bank Arrival at Kempegowda BLR (10 Long-Hauls Landed)",
        description: "Airport terminal demand surges +160%. Premium airport-to-city trips available along Bellary Road / Hebbal Expressway.",
        affectedZone: "AIRPORT",
        active: true,
        timestamp: new Date().toISOString(),
      };

      const airport = this.state.zones.AIRPORT;
      airport.currentDemand = 250;
      airport.predictedDemand15m = 310;
      airport.surgeMultiplier = 2.4;
      airport.status = "HIGH_SURGE";

      let dispatched = 0;
      this.state.drivers.forEach((driver) => {
        if (driver.status === "IDLE" && driver.currentZone !== "AIRPORT" && dispatched < 6) {
          driver.targetZone = "AIRPORT";
          driver.status = "EN_ROUTE_SURGE";
          dispatched++;
        }
      });
    }

    return this.tick();
  }
}

declare global {
  var __uberEngineInstance: UberMarketplaceEngine | undefined;
}

export const getUberEngine = (): UberMarketplaceEngine => {
  if (!global.__uberEngineInstance) {
    global.__uberEngineInstance = new UberMarketplaceEngine();
  }
  return global.__uberEngineInstance;
};
