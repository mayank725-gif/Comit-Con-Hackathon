"use client";

import React, { useState } from "react";
import { MarketplaceState } from "@/lib/uber/types";
import {
  Activity,
  Cpu,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Server,
  Zap,
  CheckCircle2,
  Terminal,
  Radio,
} from "lucide-react";

interface MichelangeloTelemetryViewProps {
  state: MarketplaceState;
  onTriggerScenario: (type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET") => Promise<void>;
  isProcessing: boolean;
}

export default function MichelangeloTelemetryView({
  state,
  onTriggerScenario,
  isProcessing,
}: MichelangeloTelemetryViewProps) {
  const [activeLogTab, setActiveLogTab] = useState<"stream" | "features">("stream");
  const [retrainingStatus, setRetrainingStatus] = useState<"IDLE" | "RETRAINING" | "RECALIBRATED">("IDLE");

  const isHealthy = state.modelHealth.status === "HEALTHY";
  const driftScore = state.modelHealth.featureDriftScore;
  const isHighDrift = driftScore > 0.40;

  const handleRetrain = async () => {
    setRetrainingStatus("RETRAINING");
    setTimeout(async () => {
      await onTriggerScenario("RESET");
      setRetrainingStatus("RECALIBRATED");
      setTimeout(() => setRetrainingStatus("IDLE"), 3000);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                MICHELANGELO CORE ML ENGINE ACTIVE
              </span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Real-Time Feature Store &amp; ML Observability Platform
            </h2>
            <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
              Uber's Michelangelo ML platform orchestrates sub-10ms spatio-temporal predictions across Bengaluru using Apache Kafka, H3 hexagonal indexing, and automated Kolmogorov-Smirnov drift self-healing.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTriggerScenario("STALE_MODEL_DRIFT")}
              disabled={isProcessing || isHighDrift}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Simulate Feature Drift</span>
            </button>

            <button
              onClick={handleRetrain}
              disabled={retrainingStatus === "RETRAINING" || isProcessing}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retrainingStatus === "RETRAINING" ? "animate-spin" : ""}`} />
              <span>
                {retrainingStatus === "RETRAINING"
                  ? "Recalibrating Weights..."
                  : retrainingStatus === "RECALIBRATED"
                  ? "✓ Model Calibrated"
                  : "Auto-Retrain Model"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Kafka Event Ingestion</span>
            <Radio className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {(state.modelHealth.featureIngestionRatePerSec || 28450).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-zinc-400">events/sec</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
            <CheckCircle2 className="h-3 w-3" />
            <span>0 Kafka topic lag &bull; 64 partitions</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Inference Latency P99</span>
            <Activity className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-400">
              {state.modelHealth.latencyMs}
            </span>
            <span className="text-xs font-mono text-zinc-400">ms</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            SLA: &lt; 15.0ms target (99.8% compliance)
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">KS Drift Statistic</span>
            <ShieldCheck className={`h-4 w-4 ${isHighDrift ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-black ${isHighDrift ? "text-amber-400" : "text-emerald-400"}`}>
              {driftScore.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-zinc-400">
              {isHighDrift ? "/ 1.0 (DRIFT!)" : "/ 1.0 (NOMINAL)"}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isHighDrift ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, driftScore * 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2 backdrop-blur-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Feature Store</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-indigo-400">
              {(state.modelHealth.activeFeatures || 1240).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-zinc-400">features</span>
          </div>
          <div className="text-[10px] text-zinc-400 font-mono">
            H3 Uber Spatial Resolution 8, 9, 10
          </div>
        </div>
      </div>

      {/* Deep-Dive Grid: Feature Drift Comparison & Kubernetes Microservices */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Feature Drift Kolmogorov-Smirnov Distribution */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-400" />
                Kolmogorov-Smirnov (KS) Feature Distribution Monitor
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Compares real-time streaming feature values against baseline model training distributions.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
              Live Stream
            </span>
          </div>

          {/* Feature Distribution Bars */}
          <div className="space-y-4">
            {/* Feature 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-zinc-300">hex_demand_surge_ratio</span>
                <span className="font-mono text-zinc-400">KS Divergence: <span className="text-emerald-400 font-bold">0.06 (Normal)</span></span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Training Baseline</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: "45%" }} />
                  </div>
                </div>
                <div>
                  <span className="text-indigo-400 block mb-0.5">Production Ingestion</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "48%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-zinc-300">rain_precipitation_mm_hr</span>
                <span className="font-mono text-zinc-400">
                  KS Divergence:{" "}
                  <span className={`font-bold ${isHighDrift ? "text-amber-400" : "text-emerald-400"}`}>
                    {isHighDrift ? "0.78 (CRITICAL)" : "0.09 (Normal)"}
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Training Baseline (Dry)</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: "15%" }} />
                  </div>
                </div>
                <div>
                  <span className="text-indigo-400 block mb-0.5">Production Ingestion (Ground Sensors)</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isHighDrift ? "bg-amber-500" : "bg-indigo-500"
                      }`}
                      style={{ width: isHighDrift ? "92%" : "18%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-zinc-300">driver_repositioning_eta_sec</span>
                <span className="font-mono text-zinc-400">KS Divergence: <span className="text-emerald-400 font-bold">0.11 (Normal)</span></span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Training Baseline</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: "60%" }} />
                  </div>
                </div>
                <div>
                  <span className="text-indigo-400 block mb-0.5">Production Ingestion</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "65%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-zinc-300">anti_herd_damping_coefficient</span>
                <span className="font-mono text-zinc-400">KS Divergence: <span className="text-emerald-400 font-bold">0.04 (Stable)</span></span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>
                  <span className="text-zinc-500 block mb-0.5">Training Baseline</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-500 rounded-full" style={{ width: "80%" }} />
                  </div>
                </div>
                <div>
                  <span className="text-indigo-400 block mb-0.5">Production Ingestion</span>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "82%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Self-Healing Failover Status Box */}
          <div className={`p-4 rounded-2xl border ${
            isHighDrift
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
              : "border-zinc-800 bg-zinc-950/60 text-zinc-300"
          } space-y-2`}>
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${isHighDrift ? "text-amber-400 animate-bounce" : "text-emerald-400"}`} />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isHighDrift ? "Automated Self-Healing Failover Active" : "Self-Healing Circuit Breaker: Armed & Standby"}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {isHighDrift
                ? "Feature drift score exceeded safe threshold (0.40). Michelangelo auto-routed dispatch decisions to the deterministic heuristic fallback engine. Zero driver downtime or surge collapse occurred."
                : "Active routing algorithm is operating on deep gradient-boosted spatial trees. If ground telemetry deviates by >40%, the system automatically falls back to deterministic heuristics in < 2ms."}
            </p>
          </div>
        </div>

        {/* Right 5 Cols: Kubernetes Microservices Mesh */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="h-4 w-4 text-emerald-400" />
                Kubernetes Mesh Telemetry
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Bengaluru region pod autoscaling &amp; memory allocations.
              </p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              4/4 Healthy
            </span>
          </div>

          <div className="space-y-3">
            {(state.modelHealth.services || []).map((service, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono font-bold text-white">{service.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    {service.podCount} Pods &bull; {service.memoryMb}MB
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-400 pt-1 border-t border-zinc-900">
                  <div>
                    <span>CPU Load: </span>
                    <span className="text-white font-bold">{service.cpuPercent}%</span>
                  </div>
                  <div className="text-right">
                    <span>P99: </span>
                    <span className="text-cyan-400 font-bold">{service.latencyP99Ms}ms</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Live Terminal Stream */}
          <div className="rounded-2xl border border-zinc-800 bg-black/90 p-3.5 space-y-2 font-mono text-[10px]">
            <div className="flex items-center gap-2 text-zinc-500 border-b border-zinc-900 pb-1.5">
              <Terminal className="h-3 w-3 text-emerald-400" />
              <span>MICHELANGELO-KERNEL.LOG</span>
            </div>
            <div className="space-y-1 text-zinc-400 overflow-hidden">
              <div className="text-emerald-400/90">&gt; [KAFKA] Ingesting 28,450 events/s across 64 topics.</div>
              <div>&gt; [H3-HEX] 1,420 spatial cells updated in Bengaluru East (Bellandur).</div>
              <div>&gt; [XAI] Anti-herd damping factor 0.82 applied to MG Road corridor.</div>
              <div className="text-cyan-400">&gt; [MODEL] P99 inference latency nominal at {state.modelHealth.latencyMs}ms.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}