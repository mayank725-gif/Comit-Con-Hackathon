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
  recentSurgeRequests?: SurgeHandlingRequest[];
}

export interface SurgeHandlingRequest {
  id: string;
  timestamp: string;
  riderName: string;
  pickupLocation: string;
  dropoffLocation: string;
  vehicleClass: string;
  surgeMultiplier: number;
  baseFareInr: number;
  surgeBonusInr: number;
  totalFareInr: number;
  dispersalGate: string;
  waveNumber: number;
  waveStatus: "DISPATCHED" | "BUFFER_QUEUED" | "EN_ROUTE" | "BALANCED";
  antiHerdEngaged: boolean;
  latencyMs: number;
}

export interface RideRequest {
  id: string;
  riderName: string;
  riderPhone?: string;
  riderRating: number;
  pickupAddress: string;
  pickupCoords: [number, number];
  dropoffAddress: string;
  dropoffCoords: [number, number];
  vehicleType: VehicleType;
  distanceKm: number;
  durationMin: number;
  fareInr: number;
  surgeMultiplier: number;
  surgeBonusInr: number;
  timestamp: string;
  status: "PENDING" | "REQUESTED" | "DISPATCHED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  paymentMode: "GOOGLE_PAY_UPI" | "CASH" | "UBER_CASH" | "CORPORATE_CARD";
  otp?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  vehicleModel?: string;
  licensePlate?: string;
  driverAvatar?: string;
  driverCoords?: [number, number];
  // Safety & Emergency Sentinel
  safetyStatus?: "SECURE" | "ANOMALY_DETECTED" | "SOS_TRIGGERED";
  routeDeviationMeters?: number;
  lastSafetyCheckTimestamp?: string;
  // Carbon & EV Telemetry
  carbonSavedKg?: number;
  isEvRide?: boolean;
}

export interface PredictiveSurgeHotspot {
  id: string;
  zoneName: string;
  city: string;
  coords: [number, number];
  predictedSurge: number;
  timeToPeakMin: number;
  confidenceScore: number;
  catalyst: string;
  earningsBoostPercent: number;
  recommendedBearingDeg: number;
  surgeStatus: "FORMING" | "PEAKING" | "DAMPING";
}

export interface RouteAnomalyAlert {
  id: string;
  tripId: string;
  type: "ROUTE_DIVERGENCE" | "PROLONGED_STOP" | "UNSCHEDULED_DETOUR" | "SILENT_SOS";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  deviationMeters: number;
  divergenceLocation: [number, number];
  status: "ACTIVE_CHECK" | "RESOLVED" | "ESCALATED_DISPATCH";
  timestamp: string;
  audioPrompt: string;
}

export interface EVChargingStation {
  id: string;
  name: string;
  provider: "TATA_POWER_EZ" | "STATIQ" | "JIO_BP_PULSE" | "ATHER_GRID";
  city: string;
  coords: [number, number];
  powerKw: number;
  availableStalls: number;
  totalStalls: number;
  costPerKwh: number;
  distanceKm: number;
  connectorType: "CCS2 / Type 2" | "CHAdeMO / CCS2" | "Bharat AC001";
}

export interface EVTelemetry {
  socPercent: number;
  batteryHealthPercent: number;
  estRangeKm: number;
  co2SavedTotalKg: number;
  chargingState: "DISCHARGING" | "CHARGING" | "LOW_BATTERY_GUARD";
  motorTempC: number;
}

export interface RideTaxInvoice {
  invoiceNumber: string;
  hsnCode: string; // 996412 - Passenger transport service
  gstin: string;
  sacCode: string;
  tripId: string;
  riderName: string;
  riderPhone?: string;
  driverName: string;
  driverPhone?: string;
  vehicleModel: string;
  licensePlate: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  distanceFare: number;
  surgeMultiplier: number;
  surgeBonus: number;
  cgstInr: number;
  sgstInr: number;
  platformFeeInr: number;
  totalInr: number;
  carbonSavedKg: number;
  upiQrString: string;
  issuedAt: string;
  paymentMode: string;
}

export interface IsochroneZone {
  minutes: 5 | 10 | 15;
  label: string;
  color: string;
  fillColor: string;
  coords: [number, number][];
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
