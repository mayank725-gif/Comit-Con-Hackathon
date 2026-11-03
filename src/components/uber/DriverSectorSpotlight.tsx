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
  if (!profile) return null;

  const currentEarnings = profile.currentEarnings || 2070;
  const target = profile.dailyEarningsTarget || 3000;
  const progressPercent = Math.min(100, Math.round((currentEarnings / target) * 100));

  return (
    <div className="rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-zinc-950 via-zinc-900 to-[#0d1624] p-5 shadow-2xl space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={profile.driverName}
              className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-400 shadow-lg shadow-cyan-500/20"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-black text-cyan-300">
              {profile.driverName.charAt(0)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                ● ACTIVE ON-DUTY
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                {profile.licensePlate} &bull; {profile.vehicleModel}
              </span>
            </div>
            <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
              <span>{profile.driverName}</span>
              <span className="text-xs text-zinc-400 font-normal">
                ({profile.cityName} Sector Hub)
              </span>
            </h3>
          </div>
        </div>

        {/* Territory Switcher & Center Map Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFlyToMySector(profile.assignedCoordinates || [12.9788, 77.5980])}
            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Navigation className="h-3.5 w-3.5 animate-pulse" />
            <span>Fly to My Sector</span>
          </button>
          <button
            onClick={onOpenTerritoryModal}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-all"
          >
            Change Area
          </button>
        </div>
      </div>

      {/* Primary Sector Metrics Row */}
      {sectorTelemetry && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-zinc-800/80">
          {/* Live Sector Surge */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">
              Assigned Sector Surge
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-400">
                {sectorTelemetry.surgeMultiplier}x
              </span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                Dynamic Peak
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 block truncate font-sans">
              {sectorTelemetry.name}
            </span>
          </div>

          {/* Real-Time Demand Deficit */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">
              Sector Demand Deficit
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-cyan-400">
                +{sectorTelemetry.deficitCount}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                / {sectorTelemetry.demandRiders} riders
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 block font-sans truncate">
              {sectorTelemetry.activeDriversCount} cabs in your sector
            </span>
          </div>

          {/* Average Trip Earnings */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">
              Expected Next Fare
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-emerald-400">
                ₹{sectorTelemetry.avgFareInr}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">/ trip</span>
            </div>
            <span className="text-[10px] text-zinc-500 block font-sans truncate">
              Includes surge + outstation bonus
            </span>
          </div>

          {/* Live Google Traffic in Sector */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold block">
              Live Arterial Speed
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {sectorTelemetry.corridorSpeedKmh}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">km/h</span>
            </div>
            <span className="text-[10px] text-amber-400 block font-sans truncate">
              {sectorTelemetry.trafficStatus}
            </span>
          </div>
        </div>
      )}

      {/* Recommended Route & Daily Shift Pacing Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-zinc-800/80 items-center text-xs">
        {/* Recommended Corridor Bypass */}
        <div className="md:col-span-7 flex items-center gap-2 text-zinc-300">
          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold shrink-0">
            DISPATCH BYPASS:
          </span>
          <span className="truncate text-zinc-200">
            {sectorTelemetry?.recommendedFlyover || "Take elevated bypass towards terminal"}
          </span>
        </div>

        {/* Daily Shift Progress Gauge */}
        <div className="md:col-span-5 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-400">Shift Goal:</span>
            <span className="text-white font-bold">
              ₹{currentEarnings} / ₹{target} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
