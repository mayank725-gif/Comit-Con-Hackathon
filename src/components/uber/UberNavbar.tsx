"use client";

import React, { useState, useRef, useEffect } from "react";
import { ModelHealth } from "@/lib/uber/types";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import {
  Car,
  Activity,
  BarChart3,
  Bot,
  Zap,
  Cpu,
  ChevronDown,
  Sparkles,
  Users,
} from "lucide-react";

export type UberTab = "map" | "copilot" | "benchmark" | "telemetry" | "radar" | "ev";
export type PortalMode = "CUSTOMER" | "DRIVER";

interface UberNavbarProps {
  portalMode: PortalMode;
  onPortalModeChange: (mode: PortalMode) => void;
  activeTab: UberTab;
  onTabChange: (tab: UberTab) => void;
  modelHealth: ModelHealth;
  onTriggerScenario: (type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET") => Promise<void>;
  isProcessing: boolean;
  currentUser?: DriverUser | null;
  currentProfile?: DriverWorkProfile | null;
  onOpenAuthModal?: () => void;
  onOpenStressTest?: () => void;
}

export default function UberNavbar({
  portalMode,
  onPortalModeChange,
  activeTab,
  onTabChange,
  modelHealth,
  onTriggerScenario,
  isProcessing,
  currentUser,
  currentProfile,
  onOpenAuthModal,
  onOpenStressTest,
}: UberNavbarProps) {
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const demoMenuRef = useRef<HTMLDivElement>(null);

  // Close demo menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (demoMenuRef.current && !demoMenuRef.current.contains(e.target as Node)) {
        setIsDemoMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 gap-3">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black font-black tracking-tighter text-lg shadow-lg shadow-white/10 shrink-0">
            Uber
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base text-white tracking-tight">
                {portalMode === "CUSTOMER" ? "Uber 2.0 Rides" : "Driver Partner Pro"}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Pan-India
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              {portalMode === "CUSTOMER"
                ? "Customer Ride Booking & Dispatch • Custom DB Persistent Storage"
                : "Real-time Google Traffic • Custom DB Persistence • 6 Metros"}
            </p>
          </div>
        </div>

        {/* Center Section: High-Profile Portal Switcher (Rider vs Driver) */}
        <div className="flex items-center gap-2">
          {/* Segmented 2-Portal Toggle */}
          <div className="flex items-center rounded-2xl border border-zinc-800 bg-zinc-900/95 p-1 text-xs shadow-inner">
            <button
              type="button"
              onClick={() => onPortalModeChange("CUSTOMER")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-extrabold transition-all ${
                portalMode === "CUSTOMER"
                  ? "bg-white text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>🚖 Rider Portal</span>
            </button>

            <button
              type="button"
              onClick={() => onPortalModeChange("DRIVER")}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-extrabold transition-all ${
                portalMode === "DRIVER"
                  ? "bg-white text-black shadow-md"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>🚗 Driver Portal</span>
            </button>
          </div>

          {/* Sub-Tabs for Driver Mode */}
          {portalMode === "DRIVER" && (
            <nav className="flex items-center gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-1 text-xs overflow-x-auto max-w-[200px] sm:max-w-none shrink-0">
              <button
                onClick={() => onTabChange("map")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeTab === "map" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Map
              </button>
              <button
                onClick={() => onTabChange("copilot")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeTab === "copilot" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Copilot
              </button>
              <button
                onClick={() => onTabChange("benchmark")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeTab === "benchmark" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                Earnings
              </button>
              <button
                onClick={() => onTabChange("telemetry")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeTab === "telemetry" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                AI Tech
              </button>
              <button
                onClick={() => onTabChange("radar")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeTab === "radar" ? "bg-zinc-800 text-amber-300" : "text-zinc-400 hover:text-white"
                }`}
              >
                Radar
              </button>
              <button
                onClick={() => onTabChange("ev")}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                  activeTab === "ev" ? "bg-zinc-800 text-emerald-300" : "text-zinc-400 hover:text-white"
                }`}
              >
                EV Hub
              </button>
            </nav>
          )}
        </div>

        {/* Right Section: Stress Test / Demo Events / Driver Sign-In */}
        <div className="flex items-center gap-2 shrink-0">
          {portalMode === "CUSTOMER" ? (
            <button
              type="button"
              onClick={onOpenStressTest}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-extrabold text-xs transition-all shadow-sm"
            >
              <span>⚡ 1,000 Ride Spike</span>
            </button>
          ) : (
            <div className="relative" ref={demoMenuRef}>
              <button
                onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition-all shadow-sm"
              >
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden md:inline">Test Rush Events</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>

              {isDemoMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-zinc-800/80">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">
                      Simulate Rush Scenarios
                    </span>
                    <p className="text-[11px] text-zinc-300">
                      Observe how the backend re-routes drivers & updates surge.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onTriggerScenario("STADIUM_CONCERT_END");
                      setIsDemoMenuOpen(false);
                    }}
                    disabled={isProcessing}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-rose-950/40 border border-transparent hover:border-rose-500/30 transition-all flex items-start gap-2.5 group"
                  >
                    <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-sm">🏏</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-rose-300">
                          IPL Match Shock
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                          3.5x
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        40,000 spectators exiting Chinnaswamy Stadium.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTriggerScenario("MONSOON_FLASH_FLOOD");
                      setIsDemoMenuOpen(false);
                    }}
                    disabled={isProcessing}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-zinc-900 border border-transparent hover:border-zinc-700 transition-all flex items-start gap-2.5 group"
                  >
                    <span className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-sm">🌧️</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white group-hover:text-zinc-200">
                          Monsoon Flash Flood
                        </span>
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-white text-black font-extrabold">
                          2.9x
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        Waterlogging along Outer Ring Road & Bellandur.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onTriggerScenario("RESET");
                      setIsDemoMenuOpen(false);
                    }}
                    disabled={isProcessing}
                    className="w-full text-left p-2 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all text-xs flex items-center justify-between"
                  >
                    <span>Reset to Normal Traffic</span>
                    <span className="text-[10px] font-mono">1.0x</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Driver Auth Button / Profile Badge */}
          {currentUser && currentProfile ? (
            <button
              onClick={onOpenAuthModal}
              title="Click to view work territory and driver settings"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left transition-all shadow-md group"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-emerald-400 shadow-sm"
              />
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-bold text-white block group-hover:text-emerald-300 truncate max-w-[110px]">
                  {currentProfile.driverName}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 block truncate max-w-[110px]">
                  📍 {currentProfile.cityName}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-500 group-hover:text-emerald-400" />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs shadow-md transition-all shadow-white/10"
            >
              <span>Driver Sign-in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
