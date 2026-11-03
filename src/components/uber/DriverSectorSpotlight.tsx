"use client";

import React from "react";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import {
  MapPin,
  TrendingUp,
  Car,
  Clock,
  Compass,
  DollarSign,
  AlertCircle,
  Navigation,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Zap,
  Users,
} from "lucide-react";

interface DriverSectorSpotlightProps {
  user: DriverUser | null;
  profile: DriverWorkProfile | null;
  sectorTelemetry: {
    name: string;
    demandRiders: number;
    surgeMultiplier: number;
    activeDriversCount: number;
    deficitCount: number;
    avgFareInr: number;
    corridorSpeedKmh: number;
    trafficStatus: string;
    recommendedFlyover: string;
  } | null;
  onFlyToMySector: (coords: [number, number]) => void;
  onOpenTerritoryModal: () => void;
}

export default function DriverSectorSpotlight({
  user,
  profile,
  sectorTelemetry,
  onFlyToMySector,
  onOpenTerritoryModal,
}: DriverSectorSpotlightProps) {
  if (!profile) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Car className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold">
                DRIVER PARTNER PORTAL
              </span>
              <span className="text-[11px] text-zinc-400">Google Verified &bull; Custom Driver Database</span>
            </div>
            <h3 className="text-base font-bold text-white mt-0.5">
              Sign in with your Google account to access your live sector &amp; shift dashboard
            </h3>
            <p className="text-xs text-zinc-400">
              Personalized surge tracking, road congestion bypass, and AI voice copilot.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTerritoryModal}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Driver Sign-in</span>
        </button>
      </div>
    );
  }

  const currentEarnings = profile.currentEarnings || 2070;
  const target = profile.dailyEarningsTarget || 3000;
  const progressPercent = Math.min(100, Math.round((currentEarnings / target) * 100));
  const remainingTarget = Math.max(0, target - currentEarnings);

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#0c1420] p-5 shadow-2xl space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={profile.driverName}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-cyan-400 shadow-lg shadow-cyan-500/20"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-black text-cyan-300 text-lg">
              {profile.driverName.charAt(0)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ON DUTY &bull; ACCEPTING RIDES
              </span>
              <span className="text-[11px] text-zinc-400">
                {profile.vehicleModel} ({profile.licensePlate})
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
              <span>{profile.driverName}</span>
              <span className="text-xs text-zinc-400 font-normal">
                &bull; Primary Hub: <strong className="text-cyan-300">{profile.cityName}</strong>
              </span>
            </h3>
          </div>
        </div>

        {/* Action Buttons: Fly to Sector & Change Area */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFlyToMySector(profile.assignedCoordinates || [12.9788, 77.5980])}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Go to My Area</span>
          </button>
          <button
            onClick={onOpenTerritoryModal}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all border border-zinc-700/60"
          >
            Change Area / Car
          </button>
        </div>
      </div>

      {/* Primary Sector Metrics Row */}
      {sectorTelemetry && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-zinc-800/80">
          {/* Card 1: Live Surge Rate */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-1">
            <span className="text-[10px] text-zinc-400 font-medium block">
              Current Fare Multiplier
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-400">
                {sectorTelemetry.surgeMultiplier}x
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                High Fare Boost
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 block truncate font-sans">
              📍 {sectorTelemetry.name}
            </span>
          </div>

          {/* Card 2: Passenger Demand */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-1">
            <span className="text-[10px] text-zinc-400 font-medium block">
              Rider Demand Opportunity
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-cyan-400">
                +{sectorTelemetry.deficitCount}
              </span>
              <span className="text-[10px] text-zinc-400">
                extra riders waiting
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 block font-sans truncate">
              {sectorTelemetry.demandRiders} passengers looking for rides
            </span>
          </div>

          {/* Card 3: Expected Fare */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-1">
            <span className="text-[10px] text-zinc-400 font-medium block">
              Estimated Next Ride Fare
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400">
                ₹{sectorTelemetry.avgFareInr}
              </span>
              <span className="text-[10px] text-zinc-400">/ trip</span>
            </div>
            <span className="text-[10px] text-zinc-400 block font-sans truncate">
              Includes surge + peak bonus
            </span>
          </div>

          {/* Card 4: Traffic Condition */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3 space-y-1">
            <span className="text-[10px] text-zinc-400 font-medium block">
              Traffic Speed &amp; Condition
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {sectorTelemetry.corridorSpeedKmh}
              </span>
              <span className="text-[10px] text-zinc-400">km/h</span>
            </div>
            <span className="text-[10px] text-amber-300 block font-sans truncate">
              {sectorTelemetry.trafficStatus}
            </span>
          </div>
        </div>
      )}

      {/* Recommended Shortcut Route & Today's Target Progress */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-800/80 items-center text-xs">
        {/* Recommended Bypass Route */}
        <div className="md:col-span-7 flex items-center gap-2 text-zinc-300">
          <span className="px-2.5 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-bold text-[10px] shrink-0 flex items-center gap-1 border border-indigo-500/30">
            <Zap className="h-3 w-3 text-amber-400" />
            FAST SHORTCUT:
          </span>
          <span className="truncate text-zinc-200 font-medium">
            {sectorTelemetry?.recommendedFlyover || "Take elevated bypass to save 12 minutes"}
          </span>
        </div>

        {/* Daily Shift Progress Gauge */}
        <div className="md:col-span-5 space-y-1 bg-zinc-950/60 p-2 rounded-2xl border border-zinc-800/60">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400 font-medium">Today's Target Progress:</span>
            <span className="text-white font-bold">
              ₹{currentEarnings} of ₹{target} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-right text-emerald-400 font-medium">
            {remainingTarget > 0 ? `₹${remainingTarget} remaining to hit today's goal!` : "🎉 Daily target achieved!"}
          </div>
        </div>
      </div>
    </div>
  );
}
