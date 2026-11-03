import { UberBenchmarkStats } from "./types";

export const UBER_BENCHMARK_DATA: UberBenchmarkStats = {
  unassistedBaseline: {
    hourlyRate: 280, // ₹280/hr
    idleTimeMin: 32.0,
    stadiumWaitTimeMin: 45.0,
    surgeVolatility: "High (3.8x spike, 1.0x crash)",
    staleModelReactionTimeMin: 45.0,
  },
  michelangeloEngine: {
    hourlyRate: 460, // ₹460/hr
    idleTimeMin: 8.5,
    stadiumWaitTimeMin: 8.0,
    surgeVolatility: "Smooth (Capped 2.8x with Damping)",
    staleModelReactionTimeMin: 0.05, // 3 seconds
  },
  improvements: {
    earningsIncreasePercent: 64,
    idleTimeReductionPercent: 73,
    waitTimeReductionPercent: 82,
    driftSelfHealingTimeSec: 3.2,
  },
};
