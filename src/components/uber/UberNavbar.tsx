"use client";

import React from "react";
import { ModelHealth } from "@/lib/uber/types";
import {
  Car,
  Zap,
  Activity,
  BarChart3,
  Bot,
  RefreshCw,
  AlertTriangle,
  Plane,
  CloudRain,
  Cpu,
} from "lucide-react";

export type UberTab = "map" | "benchmark" | "telemetry";

interface UberNavbarProps {
  activeTab: UberTab;
  onTabChange: (tab: UberTab) => void;
  modelHealth: ModelHealth;
  onTriggerScenario: (type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET") => Promise<void>;
  isProcessing: boolean;
}

export default function UberNavbar({
  activeTab,
  onTabChange,
  modelHealth,
  onTriggerScenario,
  isProcessing,
}: UberNavbarProps) {
  const isHealthy = modelHealth.status === "HEALTHY";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black font-black tracking-tighter text-lg shadow-md shadow-white/10">
            Uber
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Marketplace Brain
              </span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/25">
                Michelangelo ML
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Real-Time Dynamic Dispatch &amp; Multi-Agent Driver Copilot (Bengaluru, India)
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Map | Benchmark | Michelangelo ML) */}
        <nav className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs">
          <button
            onClick={() => onTabChange("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "map"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Live City Map</span>
          </button>

          <button
            onClick={() => onTabChange("telemetry")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "telemetry"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Michelangelo ML</span>
          </button>

          <button
            onClick={() => onTabChange("benchmark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "benchmark"
                ? "bg-white text-black shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Benchmark (20pts)</span>
          </button>
        </nav>

        {/* Right: Model Health Pill & Quick Scenario Triggers */}
        <div className="flex items-center gap-2.5">
          {/* Model Health Badge */}
          <div
            className={`hidden xl:flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              isHealthy
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400 animate-pulse"
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isHealthy ? "bg-emerald-400" : "bg-amber-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isHealthy ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            <span className="font-mono text-[11px] font-semibold">
              {isHealthy ? `ML P99: ${modelHealth.latencyMs}ms` : "Heuristic Fallback"}
            </span>
          </div>

          {/* Quick Scenario Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onTriggerScenario("STADIUM_CONCERT_END")}
              disabled={isProcessing}
              title="Trigger 40,000 attendee IPL match egress at M. Chinnaswamy Stadium"
              className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Stadium</span>
            </button>

            <button
              onClick={() => onTriggerScenario("MONSOON_FLASH_FLOOD")}
              disabled={isProcessing}
              title="Trigger Monsoon Flash Flood & Silk Board waterlogging scenario"
              className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
            >
              <CloudRain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Monsoon</span>
            </button>

            <button
              onClick={() => onTriggerScenario("STALE_MODEL_DRIFT")}
              disabled={isProcessing}
              title="Simulate 78% ML feature drift & automated self-healing fallback"
              className="flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Drift</span>
            </button>

            <button
              onClick={() => onTriggerScenario("RESET")}
              disabled={isProcessing}
              title="Reset simulation to initial state"
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}