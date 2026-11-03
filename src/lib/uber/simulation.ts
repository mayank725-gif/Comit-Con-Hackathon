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
      featureIngestionRatePerSec: 28450,
      activeFeatures: 1240,
      services: [
        {
          name: "dispatch-gateway-v2",
          podCount: 8,
          status: "HEALTHY",
          cpuPercent: 34,
          latencyP99Ms: 4.2,
          memoryMb: 512,
        },
        {
          name: "pricing-michelangelo-v4",
          podCount: 12,
          status: "HEALTHY",
          cpuPercent: 48,
          latencyP99Ms: 6.8,
          memoryMb: 1024,
        },
        {
          name: "ml-demand-forecaster",
          podCount: 6,
          status: "HEALTHY",
          cpuPercent: 42,
          latencyP99Ms: 8.5,
          memoryMb: 768,
        },
        {
          name: "mcp-agent-governor",
          podCount: 4,
          status: "HEALTHY",
          cpuPercent: 22,
          latencyP99Ms: 3.1,
          memoryMb: 384,
        },
      ],
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
        transitNetworkHealthPercent: 98.4,
      },
    };
  }

  private seedDrivers(zones: Record<ZoneId, CityZone>): Driver[] {
    const driverProfiles = [
      { name: "Ramesh Kumar", type: "UBER_GO" as const, model: "Maruti Suzuki Dzire", plate: "KA 01 MJ 1042" },
      { name: "Suresh Murthy", type: "UBER_PREMIER" as const, model: "Hyundai Verna", plate: "KA 03 AB 4091" },
      { name: "Priya Nair", type: "UBER_GREEN_EV" as const, model: "Tata Nexon EV Max", plate: "KA 05 EV 8820" },
      { name: "Amit Sharma", type: "UBER_AUTO" as const, model: "Bajaj RE 4S Auto", plate: "KA 04 AUTO 319" },
      { name: "Vikram Rao", type: "UBER_PREMIER" as const, model: "Toyota Innova Crysta", plate: "KA 51 D 7712" },
      { name: "Arjun Patil", type: "UBER_GO" as const, model: "Hyundai Aura CNG", plate: "KA 02 MH 2049" },
      { name: "Ananya Gowda", type: "UBER_GREEN_EV" as const, model: "MG ZS EV", plate: "KA 05 EV 1904" },
      { name: "Deepak Lingam", type: "UBER_AUTO" as const, model: "Piaggio Ape Auto", plate: "KA 04 AUTO 882" },
      { name: "Kavita Bhat", type: "UBER_GO" as const, model: "Maruti WagonR", plate: "KA 03 ML 6541" },
      { name: "Rajesh Oza", type: "UBER_PREMIER" as const, model: "Honda City V", plate: "KA 01 PK 9031" },
      { name: "Manoj Hegde", type: "UBER_GREEN_EV" as const, model: "Mahindra XUV400 EV", plate: "KA 53 EV 4410" },
      { name: "Kiran Das", type: "UBER_GO" as const, model: "Tata Tigor CNG", plate: "KA 02 NB 1209" },
      { name: "Sunil Verma", type: "UBER_PREMIER" as const, model: "Skoda Slavia", plate: "KA 05 PQ 8110" },
      { name: "Pooja Bellary", type: "UBER_AUTO" as const, model: "TVS King Deluxe Auto", plate: "KA 04 AUTO 551" },
      { name: "Tariq Ahmed", type: "UBER_GO" as const, model: "Maruti Dzire Tour", plate: "KA 51 C 3302" },
      { name: "Santosh F.", type: "UBER_GREEN_EV" as const, model: "Tata Tiago EV", plate: "KA 01 EV 9872" },
      { name: "Neha Menon", type: "UBER_PREMIER" as const, model: "Hyundai Creta SX", plate: "KA 03 NE 4401" },
      { name: "Ravi Prasad", type: "UBER_GO" as const, model: "Hyundai Grand i10 Nios", plate: "KA 05 RP 7761" },
      { name: "Gaurav Kulkarni", type: "UBER_AUTO" as const, model: "Bajaj Compact 4S", plate: "KA 04 AUTO 910" },
      { name: "Naveen Shetty", type: "UBER_PREMIER" as const, model: "Kia Carens Luxury", plate: "KA 01 NS 5521" },
      { name: "Mohan Gowda", type: "UBER_GO" as const, model: "Maruti Suzuki Swift", plate: "KA 02 MG 8192" },
      { name: "Rahul Wodeyar", type: "UBER_GREEN_EV" as const, model: "Tata Nexon EV Prime", plate: "KA 53 EV 7119" },
      { name: "Swati Chandran", type: "UBER_PREMIER" as const, model: "MG Hector Plus", plate: "KA 03 SC 9931" },
      { name: "Alok Joshi", type: "UBER_AUTO" as const, model: "Mahindra Alfa Auto", plate: "KA 04 AUTO 440" },
      { name: "Harish Yadav", type: "UBER_GO" as const, model: "Honda Amaze VX", plate: "KA 51 HY 2004" }
    ];

    const zoneKeys: ZoneId[] = ["STADIUM", "DOWNTOWN", "AIRPORT", "TECH_PARK", "ENTERTAINMENT"];

    return driverProfiles.map((p, i) => {
      const zoneId = zoneKeys[i % zoneKeys.length];
      const baseZone = zones[zoneId];
      // Random geographic jitter within ~1km in Bengaluru
      const lat = baseZone.lat + (Math.random() - 0.5) * 0.018;
      const lng = baseZone.lng + (Math.random() - 0.5) * 0.018;
      const status = (i % 3 === 0 ? "ON_TRIP" : i % 3 === 1 ? "IDLE" : "EN_ROUTE_SURGE");

      // Generate realistic route waypoints if en route or on trip
      const nextZoneId = zoneKeys[(i + 1) % zoneKeys.length];
      const targetZone = zones[nextZoneId];
      const routeCoordinates: [number, number][] | undefined = status !== "IDLE"
        ? [
            [lat, lng],
            [(lat + targetZone.lat) / 2 + (Math.random() - 0.5) * 0.005, (lng + targetZone.lng) / 2 + (Math.random() - 0.5) * 0.005],
            [targetZone.lat, targetZone.lng],
          ]
        : undefined;

      return {
        id: `DRV_${100 + i}`,
        name: p.name,
        rating: Math.round((4.85 + Math.random() * 0.14) * 100) / 100,
        vehicleType: p.type,
        vehicleModel: p.model,
        licensePlate: p.plate,
        batteryOrFuelPercent: Math.round(52 + Math.random() * 45),
        currentZone: zoneId,
        targetZone: status === "EN_ROUTE_SURGE" ? nextZoneId : undefined,
        status,
        lat,
        lng,
        earningsToday: Math.round(1850 + Math.random() * 950), // in ₹ INR
        tripsCompleted: Math.floor(6 + Math.random() * 8),
        shiftHours: 4.5,
        routeCoordinates: routeCoordinates,
      };
    });
  }

  public getState(): MarketplaceState {
    return this.state;
  }

  public tick(): MarketplaceState {
    this.state.step += 1;
    const zoneKeys: ZoneId[] = ["STADIUM", "DOWNTOWN", "AIRPORT", "TECH_PARK", "ENTERTAINMENT"];

    // 1. Move vehicles on real Indian city coordinates with continuous dispatch lifecycle
    this.state.drivers.forEach((driver) => {
      if (driver.targetZone) {
        const target = this.state.zones[driver.targetZone];
        const dLat = target.lat - driver.lat;
        const dLng = target.lng - driver.lng;
        const dist = Math.sqrt(dLat * dLat + dLng * dLng);

        // Calculate vehicle heading (0 to 360 deg) for realistic car rotation
        const angleDeg = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        driver.heading = Math.round((angleDeg + 360) % 360);

        // Speed in km/h (slower in flood scenario)
        const isFlood = this.state.activeScenario.type === "MONSOON_FLASH_FLOOD";
        driver.speedKmh = isFlood ? Math.round(18 + Math.random() * 12) : Math.round(38 + Math.random() * 24);

        const step = isFlood ? 0.0012 : 0.0022;

        if (dist > 0.003) {
          driver.lat += (dLat / dist) * step;
          driver.lng += (dLng / dist) * step;

          // Update active route line
          driver.routeCoordinates = [
            [driver.lat, driver.lng],
            [(driver.lat + target.lat) / 2 + 0.001, (driver.lng + target.lng) / 2 - 0.001],
            [target.lat, target.lng],
          ];
        } else {
          // Trip Completed! Payout fare & complete cycle
          const fare = Math.round((280 + Math.random() * 260) * target.surgeMultiplier);
          driver.earningsToday += fare;
          driver.tripsCompleted += 1;
          driver.currentZone = driver.targetZone;
          driver.targetZone = undefined;
          driver.status = "IDLE";
          driver.speedKmh = 0;
          driver.currentTripDestinationName = undefined;
          driver.routeCoordinates = undefined;
        }
      } else {
        // Idle driver behavior: slight street cruise & chance to pick up next trip
        driver.speedKmh = Math.round(14 + Math.random() * 10);
        driver.lat += (Math.random() - 0.5) * 0.0006;
        driver.lng += (Math.random() - 0.5) * 0.0006;
        driver.heading = Math.round(((driver.heading || 90) + (Math.random() - 0.5) * 30 + 360) % 360);

        // 35% chance per tick to receive an active dispatch or repositioning command
        if (Math.random() < 0.35) {
          const eligibleTargets = zoneKeys.filter((z) => z !== driver.currentZone);
          // Prefer zones with higher surge or deficit
          let chosen = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];
          if (this.state.zones.STADIUM.surgeMultiplier >= 2.0 && Math.random() < 0.6) {
            chosen = "STADIUM";
          } else if (this.state.zones.TECH_PARK.surgeMultiplier >= 2.0 && Math.random() < 0.5) {
            chosen = "TECH_PARK";
          }

          const targetZoneObj = this.state.zones[chosen];
          driver.targetZone = chosen;
          driver.status = Math.random() > 0.4 ? "ON_TRIP" : "EN_ROUTE_SURGE";
          driver.currentTripDestinationName = targetZoneObj.name.split(" ")[0];
          driver.routeCoordinates = [
            [driver.lat, driver.lng],
            [(driver.lat + targetZoneObj.lat) / 2, (driver.lng + targetZoneObj.lng) / 2],
            [targetZoneObj.lat, targetZoneObj.lng],
          ];
        }
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

    let activeTripsCount = 0;
    this.state.drivers.forEach((d) => {
      counts[d.currentZone] += 1;
      if (d.status === "ON_TRIP") activeTripsCount++;
    });
    this.state.metrics.totalTripsActive = activeTripsCount;

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

    // Update hourly rate based on live driver earnings
    const totalDriverEarnings = this.state.drivers.reduce((acc, d) => acc + d.earningsToday, 0);
    this.state.metrics.avgDriverHourlyRate = Math.round(totalDriverEarnings / (this.state.drivers.length * 4.5));

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
    type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET"
  ): MarketplaceState {
    if (type === "RESET") {
      this.state = this.getInitialState();
      return this.state;
    }

    if (type === "MONSOON_FLASH_FLOOD") {
      this.state.activeScenario = {
        type: "MONSOON_FLASH_FLOOD",
        title: "Monsoon Flash Flood Alert: Outer Ring Road & Silk Board Junction Waterlogged",
        description: "Severe tropical downpour across Bengaluru Tech Corridor. Bellandur underpass submerged. Dynamic flood re-routing engaged; EV fleet re-routed to elevated flyovers.",
        affectedZone: "TECH_PARK",
        active: true,
        timestamp: new Date().toISOString(),
      };

      const techPark = this.state.zones.TECH_PARK;
      techPark.currentDemand = 380;
      techPark.predictedDemand15m = 450;
      techPark.surgeMultiplier = 2.9;
      techPark.status = "HIGH_SURGE";

      const downtown = this.state.zones.DOWNTOWN;
      downtown.currentDemand = 210;
      downtown.surgeMultiplier = 2.2;
      downtown.status = "HIGH_SURGE";

      this.state.metrics.transitNetworkHealthPercent = 68.5;
      this.state.metrics.antiHerdDampingActive = true;

      // Update services telemetry to indicate heavy dynamic recalibration
      if (this.state.modelHealth.services) {
        this.state.modelHealth.services[0].cpuPercent = 78;
        this.state.modelHealth.services[1].cpuPercent = 86;
        this.state.modelHealth.services[2].latencyP99Ms = 12.4;
      }
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
        ...this.state.modelHealth,
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
