import { UberBenchmarkStats } from "./types";

export const UBER_BENCHMARK_DATA: UberBenchmarkStats = {
  unassistedBaseline: {
    hourlyRate: 18.4,
    idleTimeMin: 31.5,
    stadiumWaitTimeMin: 42.0,
    surgeVolatility: "High (3.8x spike, 1.0x crash)",
    staleModelReactionTimeMin: 45.0,
  },
  michelangeloEngine: {
    hourlyRate: 29.6,
    idleTimeMin: 8.2,
    stadiumWaitTimeMin: 7.5,
    surgeVolatility: "Smooth (Capped 2.8x with Damping)",
    staleModelReactionTimeMin: 0.05, // 3 seconds
  },
  improvements: {
    earningsIncreasePercent: 61,
    idleTimeReductionPercent: 74,
    waitTimeReductionPercent: 82,
    driftSelfHealingTimeSec: 3.2,
  },
};
