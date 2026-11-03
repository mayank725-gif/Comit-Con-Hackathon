export type ZoneId = "STADIUM" | "DOWNTOWN" | "AIRPORT" | "TECH_PARK" | "ENTERTAINMENT";

export interface CityZone {
  id: ZoneId;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  currentDemand: number;
  activeDrivers: number;
  surgeMultiplier: number; // e.g. 1.0x to 3.5x
  predictedDemand15m: number;
  deficitOrSurplus: number; // positive = deficit of drivers
  status: "NORMAL" | "HIGH_SURGE" | "DEFICIT" | "BALANCED";
}

export type DriverStatus = "IDLE" | "EN_ROUTE_SURGE" | "ON_TRIP";

export interface Driver {
  id: string;
  name: string;
  currentZone: ZoneId;
  targetZone?: ZoneId;
  status: DriverStatus;
  lat: number;
  lng: number;
  earningsToday: number;
  tripsCompleted: number;
  shiftHours: number;
}

export interface ScenarioEvent {
  type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "NORMAL";
  title: string;
  description: string;
  affectedZone?: ZoneId;
  active: boolean;
  timestamp: string;
}

export interface ModelHealth {
  status: "HEALTHY" | "DRIFT_DETECTED" | "FALLBACK_ENGAGED";
  latencyMs: number;
  featureDriftScore: number; // 0.0 to 1.0
  lastRecalibrated: string;
  activeRoutingAlgorithm: "MICHELANGELO_ML" | "REALTIME_HEURISTIC_FALLBACK";
}

export interface MarketplaceState {
  step: number;
  zones: Record<ZoneId, CityZone>;
  drivers: Driver[];
  activeScenario: ScenarioEvent;
  modelHealth: ModelHealth;
  metrics: {
    cityAvgSurge: number;
    avgRiderWaitTimeMin: number;
    avgDriverHourlyRate: number;
    unfulfilledRequests: number;
    totalTripsActive: number;
    antiHerdDampingActive: boolean;
  };
}

export interface AssistantMessage {
  id: string;
  sender: "DRIVER" | "ASSISTANT";
  agentType?: "DISPATCH" | "EVENT_INTEL" | "EARNINGS" | "SYSTEM_GUARD";
  text: string;
  timestamp: string;
  actionableRecommendation?: {
    suggestedZone: ZoneId;
    estimatedSurge: number;
    extraEarningsEstimate: string;
  };
}

export interface UberBenchmarkStats {
  unassistedBaseline: {
    hourlyRate: number;
    idleTimeMin: number;
    stadiumWaitTimeMin: number;
    surgeVolatility: string;
    staleModelReactionTimeMin: number;
  };
  michelangeloEngine: {
    hourlyRate: number;
    idleTimeMin: number;
    stadiumWaitTimeMin: number;
    surgeVolatility: string;
    staleModelReactionTimeMin: number;
  };
  improvements: {
    earningsIncreasePercent: number;
    idleTimeReductionPercent: number;
    waitTimeReductionPercent: number;
    driftSelfHealingTimeSec: number;
  };
}
