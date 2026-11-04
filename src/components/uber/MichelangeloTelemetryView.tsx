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
  Sparkles,
  MapPin,
  Clock,
  Compass,
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
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const isHealthy = state.modelHealth.status === "HEALTHY";
  const driftScore = state.modelHealth.featureDriftScore;
  const isHighDrift = driftScore > 0.40;

  const handleRetrain = async () => {
    setRetrainingStatus("RETRAINING");
    setTimeout(async () => {
      await onTriggerScenario("RESET");
      if (!isMountedRef.current) return;
      setRetrainingStatus("RECALIBRATED");
      setTimeout(() => {
        if (!isMountedRef.current) return;
        setRetrainingStatus("IDLE");
      }, 3000);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                UBER SMART DISPATCH ENGINE ONLINE
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              How Uber&apos;s AI Brain Matches Rides in Real Time
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              Every second, Uber analyzes live Google traffic speeds, passenger request surges, and weather conditions across 6 Indian metros to find the closest drivers and fastest shortcut routes.
            </p>
          </div>

          {/* User-Friendly Simulation Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onTriggerScenario("STALE_MODEL_DRIFT")}
              disabled={isProcessing || isHighDrift}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all disabled:opacity-50 shadow-sm"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Test Sudden Traffic Shock</span>
            </button>

            <button
              onClick={handleRetrain}
              disabled={retrainingStatus === "RETRAINING" || isProcessing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-zinc-100 text-black shadow-md transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${retrainingStatus === "RETRAINING" ? "animate-spin" : ""}`} />
              <span>
                {retrainingStatus === "RETRAINING"
                  ? "Re-Calibrating Routes..."
                  : retrainingStatus === "RECALIBRATED"
                  ? "✓ System Calibrated"
                  : "Auto-Calibrate System"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core Pillars of the AI Engine */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Match Speed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              ⚡ Instant Dispatch Speed
            </span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {state.modelHealth.latencyMs}
            </span>
            <span className="text-xs font-bold text-zinc-300">milliseconds</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Rider requests are paired with the optimal driver in under 10ms.
          </p>
        </div>

        {/* Metric 2: Live Data Points */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              📡 Live Road Signals
            </span>
            <Radio className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white">
              {(state.modelHealth.featureIngestionRatePerSec || 28450).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-zinc-300">updates/sec</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            Real-time speeds, GPS coordinates, and incoming passenger rides.
          </p>
        </div>

        {/* Metric 3: Route Reliability */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              🛡️ Route Reliability
            </span>
            <ShieldCheck className={`h-4 w-4 ${isHighDrift ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black ${isHighDrift ? "text-amber-400" : "text-emerald-400"}`}>
              {isHighDrift ? "Recalibrating" : "99.8%"}
            </span>
            <span className="text-xs font-bold text-zinc-300">
              {isHighDrift ? "Weather Alert" : "Optimal"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            {isHighDrift
              ? "Traffic deviation detected &mdash; elevated bypass routing active."
              : "Road predictions match live conditions seamlessly."}
          </p>
        </div>

        {/* Metric 4: Hyperlocal Sectors */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2 backdrop-blur-md shadow-md">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              🗺️ Hyperlocal Sectors
            </span>
            <Layers className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-400">
              {(state.modelHealth.activeFeatures || 1240).toLocaleString()}
            </span>
            <span className="text-xs font-bold text-zinc-300">micro-zones</span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-snug">
            High-precision hexagon sectors tracking street-by-street demand.
          </p>
        </div>
      </div>

      {/* Real-Time Live Signals Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Real-Time Signal Distribution */}
        <div className="lg:col-span-7 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400" />
                Live Real-Time Decision Factors
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Signals the AI continuously checks to recommend the highest fares and fastest routes.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              Live Stream
            </span>
          </div>

          {/* 3 User-Friendly Signal Bars */}
          <div className="space-y-4">
            {/* Signal 1 */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Passenger Request Surge Ratio</span>
                </span>
                <span className="font-black text-amber-400">2.4x Peak Surge</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-rose-400 w-[78%] rounded-full" />
              </div>
              <p className="text-[10px] text-zinc-400">
                Surges around Chinnaswamy Stadium, BKC Mumbai, and DLF Cyber City.
              </p>
            </div>

            {/* Signal 2 */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Driver Target Pacing &amp; Income Balance</span>
                </span>
                <span className="font-black text-emerald-400">92% on Track</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-emerald-500 w-[92%] rounded-full" />
              </div>
              <p className="text-[10px] text-zinc-400">
                Prioritizes drivers who are closest to achieving their daily shift goals.
              </p>
            </div>

            {/* Signal 3 */}
            <div className="space-y-1.5 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span>🌧️</span>
                  <span>Weather &amp; Road Waterlogging Sensor</span>
                </span>
                <span className="font-black text-white">
                  {isHighDrift ? "Heavy Rain Detected" : "Clear Conditions"}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isHighDrift ? "bg-amber-400 w-[85%]" : "bg-emerald-500 w-[15%]"
                  }`}
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                Monitors Bellandur and Outer Ring Road sensors to trigger flyover bypasses.
              </p>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Microservices Health & Status */}
        <div className="lg:col-span-5 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-lg">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-400" />
              System Services Status
            </h3>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Live status of dispatch, traffic, and Google map streaming pipelines.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <span className="text-xs font-bold text-white block">Google Live Traffic Overlay</span>
                  <span className="text-[10px] text-zinc-400">Road congestion streaming active</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15">
                Operational
              </span>
            </div>

            <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Hindi &amp; English Voice Engine</span>
                  <span className="text-[10px] text-zinc-400">Multi-lingual speech synthesis</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15">
                Operational
              </span>
            </div>

            <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Driver Territory Database</span>
                  <span className="text-[10px] text-zinc-400">Self-hosted local persistence</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/15">
                Self-Hosted
              </span>
            </div>

            <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <div>
                  <span className="text-xs font-bold text-white block">32 Tourist Destinations Hub</span>
                  <span className="text-[10px] text-zinc-400">Outstation pricing matrix</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/15">
                Synced
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
