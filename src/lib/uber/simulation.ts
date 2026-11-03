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
    const zones: Record<ZoneId, CityZone> = {
      STADIUM: {
        id: "STADIUM",
        name: "Chase Center & Oracle Park (Stadium)",
        lat: 37.7786,
        lng: -122.3893,
        radiusMeters: 1400,
        currentDemand: 45,
        activeDrivers: 14,
        surgeMultiplier: 1.0,
        predictedDemand15m: 60,
        deficitOrSurplus: 46,
        status: "NORMAL",
      },
      DOWNTOWN: {
        id: "DOWNTOWN",
        name: "Financial District & Market St",
        lat: 37.7946,
        lng: -122.4000,
        radiusMeters: 1600,
        currentDemand: 110,
        activeDrivers: 32,
        surgeMultiplier: 1.2,
        predictedDemand15m: 125,
        deficitOrSurplus: 93,
        status: "NORMAL",
      },
      AIRPORT: {
        id: "AIRPORT",
        name: "SFO International Airport Hub",
        lat: 37.6213,
        lng: -122.3790,
        radiusMeters: 2200,
        currentDemand: 80,
        activeDrivers: 24,
        surgeMultiplier: 1.1,
        predictedDemand15m: 95,
        deficitOrSurplus: 71,
        status: "NORMAL",
      },
      TECH_PARK: {
        id: "TECH_PARK",
        name: "SoMa Innovation & Tech Corridor",
        lat: 37.7775,
        lng: -122.4168,
        radiusMeters: 1300,
        currentDemand: 55,
        activeDrivers: 18,
        surgeMultiplier: 1.0,
        predictedDemand15m: 60,
        deficitOrSurplus: 42,
        status: "NORMAL",
      },
      ENTERTAINMENT: {
        id: "ENTERTAINMENT",
        name: "Mission & Valencia Nightlife Hub",
        lat: 37.7599,
        lng: -122.4148,
        radiusMeters: 1400,
        currentDemand: 90,
        activeDrivers: 26,
        surgeMultiplier: 1.3,
        predictedDemand15m: 110,
        deficitOrSurplus: 84,
        status: "NORMAL",
      },
    };

    const drivers: Driver[] = this.seedDrivers(zones);

    const activeScenario: ScenarioEvent = {
      type: "NORMAL",
      title: "Nominal City Operations (San Francisco Metro)",
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
        cityAvgSurge: 1.12,
        avgRiderWaitTimeMin: 7.2,
        avgDriverHourlyRate: 28.5,
        unfulfilledRequests: 18,
        totalTripsActive: 42,
        antiHerdDampingActive: false,
      },
    };
  }

  private seedDrivers(zones: Record<ZoneId, CityZone>): Driver[] {
    const driverNames = [
      "Alex M.", "Marcus V.", "Priya S.", "Elena R.", "Chen W.",
      "Jordan T.", "Samira K.", "David L.", "Amina B.", "Liam O.",
      "Fatima H.", "Carlos D.", "Kenji N.", "Sarah B.", "Tariq A.",
      "Lucas F.", "Chloe M.", "Ravi P.", "Zoe K.", "Noah S.",
      "Maya G.", "Ethan W.", "Sofia C.", "Leo J.", "Hana Y."
    ];

    const zoneKeys: ZoneId[] = ["STADIUM", "DOWNTOWN", "AIRPORT", "TECH_PARK", "ENTERTAINMENT"];

    return driverNames.map((name, i) => {
      const zoneId = zoneKeys[i % zoneKeys.length];
      const baseZone = zones[zoneId];
      // Random geographic jitter within ~800 meters (0.008 deg)
      const lat = baseZone.lat + (Math.random() - 0.5) * 0.015;
      const lng = baseZone.lng + (Math.random() - 0.5) * 0.015;

      return {
        id: `DRV_${100 + i}`,
        name,
        currentZone: zoneId,
        status: (i % 3 === 0 ? "ON_TRIP" : i % 3 === 1 ? "IDLE" : "EN_ROUTE_SURGE"),
        lat,
        lng,
        earningsToday: Math.round(110 + Math.random() * 90),
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

    // 1. Move vehicles on real coordinates
    this.state.drivers.forEach((driver) => {
      if (driver.targetZone) {
        const target = this.state.zones[driver.targetZone];
        const dLat = target.lat - driver.lat;
        const dLng = target.lng - driver.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        if (dist > 0.004) {
          // Move towards target zone
          driver.lat += (dLat / dist) * 0.0035;
          driver.lng += (dLng / dist) * 0.0035;
        } else {
          // Reached destination
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
        title: "Coldplay Concert Concludes at Chase Center (65,000 Attendees)",
        description: "Massive egress surge: Demand spiked to 480 requests against 14 active vehicles in sector.",
        affectedZone: "STADIUM",
        active: true,
        timestamp: new Date().toISOString(),
      };

      const stadium = this.state.zones.STADIUM;
      stadium.currentDemand = 480;
      stadium.predictedDemand15m = 550;
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
        title: "Predictive Feature Drift Detected in ML Pipeline",
        description: "Sensor ingest latency caused 78% prediction deviation. Michelangelo Self-Healing Fallback engaged.",
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
        title: "International Flight Bank Arrival at SFO (8 Long-Hauls Landed)",
        description: "Airport terminal demand surges +140%. High-fare airport-to-downtown trips available.",
        affectedZone: "AIRPORT",
        active: true,
        timestamp: new Date().toISOString(),
      };

      const airport = this.state.zones.AIRPORT;
      airport.currentDemand = 240;
      airport.predictedDemand15m = 290;
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
