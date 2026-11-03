"use client";

import React, { useState } from "react";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import {
  Navigation,
  ChevronDown,
  ChevronUp,
  Zap,
  Settings,
  Car,
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
  onSimulateDispatch?: () => void;
}

export default function DriverSectorSpotlight({
  user,
  profile,
  sectorTelemetry,
  onFlyToMySector,
  onOpenTerritoryModal,
  onSimulateDispatch,
}: DriverSectorSpotlightProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Unauthenticated Clean Banner
  if (!profile) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Driver Partner Portal</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold">
                Google Verified
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sign in with Google to activate your high-yield operating territory and live AI dispatch copilot.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTerritoryModal}
          className="shrink-0 px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Sign In with Google</span>
        </button>
      </div>
    );
  }

  const currentEarnings = profile.currentEarnings || 2070;
  const target = profile.dailyEarningsTarget || 3000;
  const progressPercent = Math.min(100, Math.round((currentEarnings / target) * 100));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/95 shadow-xl backdrop-blur-md overflow-hidden transition-all">
      {/* Sleek Compact Driver HUD (Hero Line) */}
      <div className="p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Driver Identity */}
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={profile.driverName}
              className="w-10 h-10 rounded-xl object-cover border border-cyan-400/60 shadow-md"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-bold text-cyan-300 text-sm">
              {profile.driverName.charAt(0)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-white">{profile.driverName}</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              {profile.cityName} &bull; {profile.vehicleModel} ({profile.licensePlate})
            </p>
          </div>
        </div>

        {/* Operating Area & Live Surge Pill */}
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-xl">
          <span className="text-xs font-semibold text-zinc-300">
            📍 {profile.primaryZoneName.split("&")[0].trim()}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center gap-1">
            ⚡ {sectorTelemetry?.surgeMultiplier || 2.4}x Surge
          </span>
        </div>

        {/* Shift Goal & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Shift Earnings Progress Badge */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-zinc-400 font-medium">Today's Shift:</span>
            <span className="text-xs font-bold text-emerald-400">
              ₹{currentEarnings} / ₹{target} ({progressPercent}%)
            </span>
          </div>

          <button
            onClick={() => onFlyToMySector(profile.assignedCoordinates || [12.9788, 77.5980])}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Go to My Area</span>
          </button>

          {onSimulateDispatch && (
            <button
              type="button"
              onClick={onSimulateDispatch}
              title="Simulate an incoming passenger ride request for your car"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
            >
              <span>🔔 Test Dispatch</span>
            </button>
          )}

          <button
            onClick={onOpenTerritoryModal}
            title="Update Work Territory or Vehicle"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:text-white transition-all"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title="Toggle Detailed Shift Telemetry"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-zinc-800"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Optional Expandable Shift Details Drawer */}
      {isExpanded && sectorTelemetry && (
        <div className="border-t border-zinc-800/80 bg-zinc-950 p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fadeIn text-xs">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <span className="text-[10px] text-zinc-400 block">Waiting Riders</span>
            <span className="text-base font-bold text-cyan-300">+{sectorTelemetry.deficitCount} Extra Riders</span>
            <span className="text-[10px] text-zinc-500 block">High demand pickup zone</span>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <span className="text-[10px] text-zinc-400 block">Avg Fare / Trip</span>
            <span className="text-base font-bold text-emerald-400">₹{sectorTelemetry.avgFareInr}</span>
            <span className="text-[10px] text-zinc-500 block">Includes surge pricing</span>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <span className="text-[10px] text-zinc-400 block">Traffic Speed</span>
            <span className="text-base font-bold text-white">{sectorTelemetry.corridorSpeedKmh} km/h</span>
            <span className="text-[10px] text-amber-300 block">{sectorTelemetry.trafficStatus}</span>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2.5">
            <span className="text-[10px] text-zinc-400 block">Bypass Shortcut</span>
            <span className="text-xs font-semibold text-zinc-200 block truncate flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400 shrink-0" />
              {sectorTelemetry.recommendedFlyover || "Flyover route"}
            </span>
            <span className="text-[10px] text-emerald-400 block">Saves ~12 min travel</span>
          </div>
        </div>
      )}
    </div>
  );
}
