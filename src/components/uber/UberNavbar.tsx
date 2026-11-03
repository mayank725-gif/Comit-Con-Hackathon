"use client";

import React from "react";
import { ModelHealth } from "@/lib/uber/types";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
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
  User,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";

export type UberTab = "map" | "benchmark" | "telemetry";

interface UberNavbarProps {
  activeTab: UberTab;
  onTabChange: (tab: UberTab) => void;
  modelHealth: ModelHealth;
  onTriggerScenario: (type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET") => Promise<void>;
  isProcessing: boolean;
  currentUser?: DriverUser | null;
  currentProfile?: DriverWorkProfile | null;
  onOpenAuthModal?: () => void;
}

export default function UberNavbar({
  activeTab,
  onTabChange,
  modelHealth,
  onTriggerScenario,
  isProcessing,
  currentUser,
  currentProfile,
  onOpenAuthModal,
}: UberNavbarProps) {
  const isHealthy = modelHealth.status === "HEALTHY";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-black font-black tracking-tighter text-base shadow-md shadow-white/10 shrink-0">
            Uber
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                Marketplace Brain
              </span>
              <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] font-mono font-bold text-cyan-400 border border-cyan-500/30">
                Michelangelo 2.0
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 hidden sm:block font-mono">
              Pan-India Real-Time Dynamic Dispatch &bull; Google Live Traffic
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs (Map | Benchmark | Michelangelo ML) */}
        <nav className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-zinc-900/80 p-1 text-xs">
          <button
            onClick={() => onTabChange("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "map"
                ? "bg-white text-black shadow-sm font-bold"
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
                ? "bg-white text-black shadow-sm font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Michelangelo ML</span>
          </button>

          <button
            onClick={() => onTabChange("benchmark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === "benchmark"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Benchmark</span>
          </button>
        </nav>

        {/* Right: Driver Authentication Badge / Google Sign-in & Scenarios */}
        <div className="flex items-center gap-2">
          {/* Driver Login / Work Profile Chip */}
          {currentUser && currentProfile ? (
            <button
              onClick={onOpenAuthModal}
              title="Click to view work territory and driver settings"
              className="flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-cyan-500/40 text-left transition-all shadow-md group"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-cyan-400"
              />
              <div className="hidden md:block leading-tight">
                <span className="text-xs font-bold text-white block group-hover:text-cyan-300 truncate max-w-[120px]">
                  {currentProfile.driverName}
                </span>
                <span className="text-[9px] font-mono text-cyan-400 block">
                  📍 {currentProfile.cityName} &bull; {currentProfile.licensePlate}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-500 group-hover:text-cyan-400" />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-xs shadow-md transition-all shadow-cyan-500/10"
            >
              {/* Google Multi-Color SVG Icon */}
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Driver Sign-in</span>
            </button>
          )}

          {/* Quick Scenario Triggers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTriggerScenario("STADIUM_CONCERT_END")}
              disabled={isProcessing}
              title="Trigger 40,000 attendee IPL match egress at M. Chinnaswamy Stadium"
              className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition-all disabled:opacity-50"
            >
              <Zap className="h-3 w-3" />
              <span className="hidden lg:inline text-[11px]">Stadium</span>
            </button>

            <button
              onClick={() => onTriggerScenario("MONSOON_FLASH_FLOOD")}
              disabled={isProcessing}
              title="Trigger Monsoon Flash Flood & Silk Board waterlogging scenario"
              className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all disabled:opacity-50"
            >
              <CloudRain className="h-3 w-3" />
              <span className="hidden lg:inline text-[11px]">Monsoon</span>
            </button>

            <button
              onClick={() => onTriggerScenario("RESET")}
              disabled={isProcessing}
              title="Reset simulation to initial state"
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
