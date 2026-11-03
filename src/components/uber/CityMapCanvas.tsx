"use client";

import React from "react";
import { MarketplaceState, ZoneId } from "@/lib/uber/types";
import { Car, Zap, Users, Navigation } from "lucide-react";

interface CityMapCanvasProps {
  state: MarketplaceState;
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
}

export default function CityMapCanvas({
  state,
  selectedZone,
  onSelectZone,
}: CityMapCanvasProps) {
  const zones = Object.values(state.zones);

  return (
    <div className="relative w-full aspect-[16/10] min-h-[480px] rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 overflow-hidden shadow-2xl p-6 select-none">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* SVG Highways connecting zones */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="arterialGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Arterial Highways from Downtown (50%, 50%) to others */}
        <line x1="50%" y1="50%" x2="78%" y2="22%" stroke="url(#arterialGlow)" strokeWidth="2.5" strokeDasharray="6 4" />
        <line x1="50%" y1="50%" x2="18%" y2="82%" stroke="url(#arterialGlow)" strokeWidth="2.5" strokeDasharray="6 4" />
        <line x1="50%" y1="50%" x2="22%" y2="24%" stroke="url(#arterialGlow)" strokeWidth="2.5" strokeDasharray="6 4" />
        <line x1="50%" y1="50%" x2="75%" y2="78%" stroke="url(#arterialGlow)" strokeWidth="2.5" strokeDasharray="6 4" />
        {/* Ring Road between Stadium and Entertainment */}
        <line x1="78%" y1="22%" x2="75%" y2="78%" stroke="#374151" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
      </svg>

      {/* City Zones */}
      {zones.map((zone) => {
        const isSelected = selectedZone === zone.id;
        const isHighSurge = zone.surgeMultiplier >= 2.0;
        const isSevereSurge = zone.surgeMultiplier >= 3.0;

        return (
          <div
            key={zone.id}
            onClick={() => onSelectZone(zone.id)}
            style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-10 group"
          >
            {/* Surge Pulse Halo */}
            {isHighSurge && (
              <div
                className={`absolute inset-0 -m-8 rounded-full animate-ping opacity-30 pointer-events-none ${
                  isSevereSurge ? "bg-rose-500" : "bg-amber-500"
                }`}
              />
            )}

            {/* Zone Center Node */}
            <div
              className={`relative flex flex-col items-center p-3.5 rounded-2xl border backdrop-blur-md transition-all ${
                isSelected
                  ? "border-indigo-400 bg-indigo-950/80 scale-110 shadow-lg shadow-indigo-500/25 ring-2 ring-indigo-400/50"
                  : isSevereSurge
                  ? "border-rose-500/60 bg-rose-950/80 shadow-lg shadow-rose-500/20"
                  : isHighSurge
                  ? "border-amber-500/60 bg-amber-950/80 shadow-lg shadow-amber-500/20"
                  : "border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 hover:scale-105"
              }`}
            >
              {/* Header Badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-extrabold text-white tracking-tight whitespace-nowrap">
                  {zone.name}
                </span>
                <span
                  className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                    isSevereSurge
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
                      : isHighSurge
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {zone.surgeMultiplier}x
                </span>
              </div>

              {/* Demand vs Supply Bars */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                <span className="flex items-center gap-0.5 text-zinc-300">
                  <Users className="h-3 w-3 text-indigo-400" />
                  {zone.currentDemand}
                </span>
                <span>/</span>
                <span className="flex items-center gap-0.5 text-emerald-400 font-semibold">
                  <Car className="h-3 w-3" />
                  {zone.activeDrivers}
                </span>
              </div>

              {/* Deficit Alert Tag */}
              {zone.deficitOrSurplus > 20 && (
                <span className="mt-1 text-[8px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300">
                  Deficit: +{zone.deficitOrSurplus}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Real-Time Animated Vehicles */}
      {state.drivers.map((driver) => {
        const isEnRoute = driver.status === "EN_ROUTE_SURGE";
        const isOnTrip = driver.status === "ON_TRIP";

        return (
          <div
            key={driver.id}
            style={{
              left: `${driver.x}%`,
              top: `${driver.y}%`,
              transition: "left 0.8s ease-out, top 0.8s ease-out",
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none group"
            title={`${driver.name} (${driver.status})`}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full shadow-md transition-all ${
                isEnRoute
                  ? "bg-cyan-400 ring-2 ring-cyan-400/50 scale-125"
                  : isOnTrip
                  ? "bg-violet-400 opacity-75"
                  : "bg-emerald-400 opacity-90"
              }`}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-black" />
            </div>
          </div>
        );
      })}

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-30 rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-md p-3 space-y-1.5 text-[10px] font-mono">
        <div className="text-[11px] font-bold text-white mb-1">Live Fleet Telemetry</div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-zinc-300">Idle / Available ({state.drivers.filter(d => d.status === "IDLE").length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-zinc-300">Dispatched to Surge ({state.drivers.filter(d => d.status === "EN_ROUTE_SURGE").length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          <span className="text-zinc-300">On Active Trip ({state.drivers.filter(d => d.status === "ON_TRIP").length})</span>
        </div>
      </div>

      {/* Active Scenario Banner */}
      {state.activeScenario.active && state.activeScenario.type !== "NORMAL" && (
        <div className="absolute top-4 left-4 z-30 max-w-md rounded-2xl border border-amber-500/40 bg-zinc-950/90 backdrop-blur-md p-3.5 space-y-1 shadow-xl">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300">
              {state.activeScenario.title}
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-snug">
            {state.activeScenario.description}
          </p>
        </div>
      )}
    </div>
  );
}
