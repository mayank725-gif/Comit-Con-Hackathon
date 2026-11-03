export type MetroCity =
  | "ALL_INDIA"
  | "BENGALURU"
  | "DELHI_NCR"
  | "MUMBAI"
  | "HYDERABAD"
  | "CHENNAI"
  | "KOLKATA";

export type ZoneId =
  | "STADIUM"
  | "DOWNTOWN"
  | "AIRPORT"
  | "TECH_PARK"
  | "ENTERTAINMENT"
  | "DELHI_CENTRAL"
  | "DELHI_AIRPORT"
  | "DELHI_GURGAON"
  | "MUMBAI_BKC"
  | "MUMBAI_AIRPORT"
  | "MUMBAI_SOUTH"
  | "HYDERABAD_HITEC"
  | "HYDERABAD_AIRPORT"
  | "CHENNAI_OMR"
  | "KOLKATA_SALTLAKE";

export type VehicleType = "UBER_GO" | "UBER_PREMIER" | "UBER_AUTO" | "UBER_GREEN_EV";

export interface CityZone {
  id: ZoneId;
  name: string;
  city: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  currentDemand: number;
  activeDrivers: number;
  surgeMultiplier: number;
  predictedDemand15m: number;
  deficitOrSurplus: number;
  status: "NORMAL" | "HIGH_SURGE" | "DEFICIT" | "BALANCED";
}

export type DriverStatus = "IDLE" | "EN_ROUTE_SURGE" | "ON_TRIP";

export interface Driver {
  id: string;
  name: string;
  city?: string;
  rating: number;
  vehicleType: VehicleType;
  vehicleModel: string;
  licensePlate: string;
  batteryOrFuelPercent: number;
  currentZone: ZoneId;
  targetZone?: ZoneId;
  status: DriverStatus;
  lat: number;
  lng: number;
  heading?: number; // 0-360 degrees rotation angle
  speedKmh?: number; // live GPS velocity
  currentTripDestinationName?: string;
  earningsToday: number;
  tripsCompleted: number;
  shiftHours: number;
  routeCoordinates?: [number, number][]; // lat, lng waypoints
}

export interface ScenarioEvent {
  type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "NORMAL";
  title: string;
  description: string;
  affectedZone?: ZoneId;
  active: boolean;
  timestamp: string;
}

export interface MichelangeloMicroservice {
  name: string;
  podCount: number;
  status: "HEALTHY" | "DEGRADED" | "SELF_HEALING";
  cpuPercent: number;
  latencyP99Ms: number;
  memoryMb: number;
}

export interface ModelHealth {
  status: "HEALTHY" | "DRIFT_DETECTED" | "FALLBACK_ENGAGED";
  latencyMs: number;
  featureDriftScore: number; // 0.0 to 1.0 (Kolmogorov-Smirnov test)
  lastRecalibrated: string;
  activeRoutingAlgorithm: "MICHELANGELO_ML" | "REALTIME_HEURISTIC_FALLBACK";
  featureIngestionRatePerSec: number;
  activeFeatures: number;
  services: MichelangeloMicroservice[];
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
    avgDriverHourlyRate: number; // in ₹ INR
    unfulfilledRequests: number;
    totalTripsActive: number;
    antiHerdDampingActive: boolean;
    transitNetworkHealthPercent: number;
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
  routingTrace?: {
    confidenceScore: number;
    tokensEvaluated: number;
    featuresQueried: string[];
    latencyMs: number;
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
