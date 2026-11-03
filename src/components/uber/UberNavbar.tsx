"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Sparkles,
  Flame,
} from "lucide-react";

export type UberTab = "map" | "copilot" | "benchmark" | "telemetry";

interface UberNavbarProps {
  activeTab: UberTab;
  onTabChange: (tab: UberTab) => void;
  modelHealth: ModelHealth;
  onTriggerScenario: (type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET") => Promise<void>;
  isProcessing: boolean;
  currentUser?: DriverUser | null;
  currentProfile?: DriverWorkProfile | null;
  onOpenAuthModal?: () => void;
  onOpenRiderBooking?: () => void;
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
  onOpenRiderBooking,
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
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black font-black tracking-tighter text-lg shadow-lg shadow-white/10 shrink-0">
            Uber
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm sm:text-base text-white tracking-tight">
                Driver Partner Pro
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Pan-India
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Real-time Google Traffic &bull; Smart Earnings Copilot &bull; 6 Metros
            </p>
          </div>
        </div>

        {/* Center Navigation: User-Friendly Driver Tabs */}
        <nav className="flex items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs shadow-inner">
          <button
            onClick={() => onTabChange("map")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === "map"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Driver Map</span>
          </button>

          <button
            onClick={() => onTabChange("copilot")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === "copilot"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Voice Copilot</span>
          </button>

          <button
            onClick={() => onTabChange("benchmark")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === "benchmark"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Earnings Insights</span>
            <span className="xs:hidden">Earnings</span>
          </button>

          <button
            onClick={() => onTabChange("telemetry")}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === "telemetry"
                ? "bg-white text-black shadow-md"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">How AI Works</span>
            <span className="sm:hidden">AI Tech</span>
          </button>
        </nav>

        {/* Right Section: Rider Booking, Rush Events & Driver Sign-In */}
        <div className="flex items-center gap-2">
          {/* Uber 2.0 Two-Sided Ride Booking Trigger */}
          <button
            type="button"
            onClick={onOpenRiderBooking}
            title="Book a ride as a Passenger (Two-Sided Marketplace Test)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/50 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 font-extrabold text-xs transition-all shadow-sm"
          >
            <span>🚖 Book Ride</span>
          </button>

          {/* Live Events Dropdown (User-Friendly Demo Triggers) */}
          <div className="relative" ref={demoMenuRef}>
            <button
              onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
              title="Test real-time surge events like Cricket matches and Rain floods"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold text-xs transition-all shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden md:inline">Test Rush Events</span>
              <ChevronDown className="h-3 w-3 opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {isDemoMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl shadow-2xl p-2 z-50 space-y-1 animate-fadeIn">
                <div className="px-3 py-1.5 border-b border-zinc-800/80">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">
                    Simulate Live City Conditions
                  </span>
                  <p className="text-[11px] text-zinc-300">
                    Watch how the AI copilot re-routes drivers and updates fares.
                  </p>
                </div>

                {/* Event 1: Stadium */}
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
                        IPL Stadium Match Rush
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                        3.5x Surge
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      40,000 cricket fans exiting M. Chinnaswamy Stadium
                    </p>
                  </div>
                </button>

                {/* Event 2: Monsoon */}
                <button
                  onClick={() => {
                    onTriggerScenario("MONSOON_FLASH_FLOOD");
                    setIsDemoMenuOpen(false);
                  }}
                  disabled={isProcessing}
                  className="w-full text-left p-2.5 rounded-xl hover:bg-cyan-950/40 border border-transparent hover:border-cyan-500/30 transition-all flex items-start gap-2.5 group"
                >
                  <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 text-sm">🌧️</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300">
                        Monsoon Waterlogging
                      </span>
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-cyan-500 text-black">
                        +₹280 Bonus
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Outer Ring Road bypass &amp; rain fare bonus
                    </p>
                  </div>
                </button>

                {/* Event 3: Reset */}
                <button
                  onClick={() => {
                    onTriggerScenario("RESET");
                    setIsDemoMenuOpen(false);
                  }}
                  disabled={isProcessing}
                  className="w-full text-left p-2 rounded-xl hover:bg-zinc-900 border border-transparent transition-all flex items-center gap-2 text-zinc-400 hover:text-white"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isProcessing ? "animate-spin text-white" : ""}`} />
                  <span className="text-xs font-medium">Reset to Normal Traffic</span>
                </button>
              </div>
            )}
          </div>

          {/* Driver Login / Work Territory Profile Chip */}
          {currentUser && currentProfile ? (
            <button
              onClick={onOpenAuthModal}
              title="Click to view work territory and driver settings"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-2xl bg-zinc-900 hover:bg-zinc-850 border border-cyan-500/40 text-left transition-all shadow-md group"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-cyan-400 shadow-sm"
              />
              <div className="hidden sm:block leading-tight">
                <span className="text-xs font-bold text-white block group-hover:text-cyan-300 truncate max-w-[110px]">
                  {currentProfile.driverName}
                </span>
                <span className="text-[10px] font-mono text-cyan-400 block truncate max-w-[110px]">
                  📍 {currentProfile.cityName}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-zinc-500 group-hover:text-cyan-400" />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-zinc-100 text-black font-bold text-xs shadow-md transition-all shadow-white/10"
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
        </div>
      </div>
    </header>
  );
}
