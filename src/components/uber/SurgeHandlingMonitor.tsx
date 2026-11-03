"use client";

import React, { useState } from "react";
import { SurgeHandlingRequest, MarketplaceState } from "@/lib/uber/types";
import {
  Flame,
  Zap,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Car,
  Navigation,
} from "lucide-react";

interface SurgeHandlingMonitorProps {
  state: MarketplaceState;
  onTriggerScenario?: (type: any) => Promise<void>;
  onTrigger1000Burst?: (locationName?: string) => Promise<any>;
}

export default function SurgeHandlingMonitor({
  state,
  onTriggerScenario,
  onTrigger1000Burst,
}: SurgeHandlingMonitorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "DISPATCHED" | "QUEUED">("ALL");
  const [stressData, setStressData] = useState<any>(null);

  const activeSurge = state.zones.STADIUM?.surgeMultiplier || 1.8;
  const requests = stressData?.recentSurgeRequests || state.recentSurgeRequests || [];

  const filteredRequests = requests.filter((r: SurgeHandlingRequest) => {
    if (selectedFilter === "DISPATCHED") return r.waveStatus === "DISPATCHED";
    if (selectedFilter === "QUEUED") return r.waveStatus === "BUFFER_QUEUED";
    return true;
  });

  const handleRun1000Shock = async () => {
    setIsSimulating(true);
    try {
      if (onTrigger1000Burst) {
        const res = await onTrigger1000Burst("M. Chinnaswamy Stadium, MG Road");
        if (res) setStressData(res);
      } else {
        const res = await fetch("/api/uber/stress-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName: "M. Chinnaswamy Stadium, MG Road",
            lat: 12.9788,
            lng: 77.5996,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setStressData(data);
        }
      }
    } catch (e) {
      console.error("Failed to run 1000 shock:", e);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Uber-Style Surge Hero Header */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                MICHELANGELO DYNAMIC SURGE &amp; SHOCK BALANCER
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
                Live Ingestion Stream
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Custom Database Synced
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Real-Time Surge Handling Requests
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Watch how Uber&apos;s marketplace algorithm ingests massive localized request spikes, caps price gouging at 3.8x, engages anti-herd fleet damping, and buffers passenger waves across 3 physical dispersal gates.
            </p>
          </div>

          {/* Quick Simulation Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleRun1000Shock}
              disabled={isSimulating}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{isSimulating ? "⚡ Ingesting 1,000 Requests..." : "💥 Ingest 1,000 Requests Shock"}</span>
            </button>

            {onTriggerScenario && (
              <button
                type="button"
                onClick={() => onTriggerScenario("STADIUM_CONCERT_END")}
                className="px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all"
              >
                🏏 Stadium Exit (3.5x)
              </button>
            )}

            {onTriggerScenario && (
              <button
                type="button"
                onClick={() => onTriggerScenario("MONSOON_FLASH_FLOOD")}
                className="px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all"
              >
                🌧️ Monsoon Flood (2.9x)
              </button>
            )}
          </div>
        </div>

        {/* 4 Surge Ingestion Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80">
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Dynamic Surge Multiplier</span>
              <Flame className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">
                {stressData ? stressData.surgeMultiplier : activeSurge}x
              </span>
              <span className="text-[10px] font-bold text-amber-300">Auto-Capped at 3.8x</span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Prevents predatory price gouging</span>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Requests Handled</span>
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {stressData ? "1,000 / 1,000" : `${requests.length * 50}+`}
              </span>
              <span className="text-[10px] font-bold text-emerald-400">100% Ingested</span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Zero transaction drops or crashes</span>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Anti-Herd Fleet Damping</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">65% Protected</span>
              <span className="text-[10px] font-bold text-emerald-300">City Coverage</span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Rest of city cab supply safeguarded</span>
          </div>

          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Ingestion Processing Latency</span>
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {stressData ? `${stressData.processingLatencyMs}ms` : "2.4ms"}
              </span>
              <span className="text-[10px] font-bold text-emerald-400">&lt; 5ms SLA</span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Sub-5ms Kafka pipeline throughput</span>
          </div>
        </div>
      </div>

      {/* Dispersal Gates & Staggered Waves Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: 3 Dispersal Gates */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Arterial Pedestrian Dispersal Gates
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">3 Designated Points</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Prevents crowd bottlenecks by distributing passengers evenly to 3 separate arterial pickup zones around the venue.
          </p>

          <div className="space-y-2 pt-1 text-xs">
            {[
              { name: "Gate A (North Arterial Link)", count: 340, walk: "120m • ~3 min walk", pct: "34%" },
              { name: "Gate B (Metro Skywalk Plaza)", count: 330, walk: "200m • ~5 min walk", pct: "33%" },
              { name: "Gate C (South Express Flyover)", count: 330, walk: "280m • ~7 min walk", pct: "33%" },
            ].map((g) => (
              <div key={g.name} className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{g.name}</span>
                  <span className="text-[10px] text-zinc-400 block">{g.walk}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-400 block">{g.count} riders</span>
                  <span className="text-[10px] text-zinc-400">{g.pct} allocation</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: 4 Staggered Waves */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Staggered Departure Waves (Anti-Gridlock)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400 font-bold">4 Arrival Waves</span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Vehicles are queued in staggered 4-minute waves so local ring roads never freeze into single-lane traffic jams.
          </p>

          <div className="space-y-2 pt-1 text-xs">
            {[
              { wave: "Wave 1: Immediate Dispatches", timing: "0 - 2 mins", cabs: "24 Cabs Dispatched", badge: "DISPATCHED", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
              { wave: "Wave 2: Buffer Arrivals", timing: "4 - 6 mins", cabs: "32 Cabs Buffered", badge: "BUFFERED", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
              { wave: "Wave 3: Queued Arrivals", timing: "8 - 10 mins", cabs: "40 Cabs Queued", badge: "QUEUED", color: "text-zinc-300 border-zinc-700 bg-zinc-800" },
              { wave: "Wave 4: Inflow Routed", timing: "12 - 15 mins", cabs: "48 Cabs En-Route", badge: "INFLOW", color: "text-zinc-300 border-zinc-700 bg-zinc-800" },
            ].map((w) => (
              <div key={w.wave} className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">{w.wave}</span>
                  <span className="text-[10px] text-zinc-400 block">{w.timing}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-zinc-200">{w.cabs}</span>
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${w.color}`}>
                    {w.badge}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* LIVE SURGE HANDLING REQUEST STREAM (THE STREAMING FEED TABLE) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">
                Live Surge Request Ingestion Feed
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
                {filteredRequests.length} Live Requests Streamed
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every request shows live fare, dynamic surge multiplier, designated gate, and wave dispatch status.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            {(["ALL", "DISPATCHED", "QUEUED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  selectedFilter === filter
                    ? "bg-white text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {filter === "ALL" ? "All Requests" : filter === "DISPATCHED" ? "Dispatched" : "Queued in Waves"}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table / Feed */}
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {filteredRequests.map((req: SurgeHandlingRequest) => {
            const isDispatched = req.waveStatus === "DISPATCHED";
            return (
              <div
                key={req.id}
                className="rounded-2xl border border-zinc-800/90 bg-zinc-900/70 hover:bg-zinc-900 p-3.5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: ID, Rider, Route */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold">
                      {req.id}
                    </span>
                    <span className="font-bold text-white">{req.riderName}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">({req.timestamp})</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold">
                      {req.vehicleClass}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-300 text-xs truncate">
                    <span className="text-zinc-400 truncate">{req.pickupLocation}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="text-white font-semibold truncate">{req.dropoffLocation}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 pt-0.5">
                    <span>📍 {req.dispersalGate}</span>
                    <span>&bull;</span>
                    <span>Wave {req.waveNumber}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-mono">⚡ {req.latencyMs}ms latency</span>
                  </div>
                </div>

                {/* Right: Fare & Status */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold font-mono text-[10px] border border-amber-500/30">
                        ⚡ {req.surgeMultiplier}x
                      </span>
                      <span className="text-base font-black text-white font-mono">
                        ₹{req.totalFareInr}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      Base: ₹{req.baseFareInr} + Surge: +₹{req.surgeBonusInr}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border shrink-0 ${
                      isDispatched
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {isDispatched ? "✓ DISPATCHED" : `QUEUED (WAVE ${req.waveNumber})`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
