"use client";

import React, { useState } from "react";
import { EVChargingStation, EVTelemetry } from "@/lib/uber/types";
import { VERIFIED_EV_CHARGING_HUBS, evEngine } from "@/lib/uber/evEngine";
import { uberAudio } from "@/lib/uber/soundEffects";
import {
  Zap,
  BatteryCharging,
  Gauge,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  MapPin,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface EVChargingStationHUDProps {
  driverCoords?: [number, number];
  onRouteToStation?: (station: EVChargingStation) => void;
}

export default function EVChargingStationHUD({
  driverCoords = [12.9788, 77.5996],
  onRouteToStation,
}: EVChargingStationHUDProps) {
  const [socPercent, setSocPercent] = useState<number>(68);
  const [selectedStation, setSelectedStation] = useState<EVChargingStation | null>(null);
  const [routingStationId, setRoutingStationId] = useState<string | null>(null);

  const nearestStations = evEngine.getNearestStations(driverCoords);
  const safetyCheck = evEngine.evaluateBatterySafety(socPercent, 35); // 35km airport trip check

  const handleRoute = (station: EVChargingStation) => {
    uberAudio.playRadarPingTone();
    setRoutingStationId(station.id);
    if (onRouteToStation) {
      onRouteToStation(station);
    }
  };

  const getBatteryColor = (soc: number) => {
    if (soc > 50) return "text-emerald-400 border-emerald-500/40 bg-emerald-950/30";
    if (soc > 25) return "text-amber-400 border-amber-500/40 bg-amber-950/30";
    return "text-rose-400 border-rose-500/40 bg-rose-950/30 animate-pulse";
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight text-white uppercase">
                EV Fleet & Smart Charging Sentinel
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Zero Emissions
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Battery state of charge, long-trip safety guard & DC fast charger locator
            </p>
          </div>
        </div>

        {/* Quick Battery Simulation Slider */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-zinc-500 text-[10px] hidden sm:inline">Simulate SoC:</span>
          <input
            type="range"
            min="10"
            max="100"
            value={socPercent}
            onChange={(e) => setSocPercent(Number(e.target.value))}
            className="w-20 sm:w-28 accent-emerald-500 cursor-pointer"
          />
          <span className="font-bold text-white">{socPercent}%</span>
        </div>
      </div>

      {/* Battery State & Range Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border ${getBatteryColor(socPercent)} space-y-1`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase text-zinc-400">Battery Level</span>
            <BatteryCharging className="h-4 w-4" />
          </div>
          <div className="text-2xl font-black">{socPercent}%</div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                socPercent > 50
                  ? "bg-emerald-500"
                  : socPercent > 25
                  ? "bg-amber-500"
                  : "bg-rose-500"
              }`}
              style={{ width: `${socPercent}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-mono uppercase">Est. Range</span>
            <Gauge className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {safetyCheck.remainingRangeKm} km
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            Based on 3.0 km/1%
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-mono uppercase">CO₂ Offset Today</span>
            <Leaf className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            18.4 kg
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            vs Diesel cab baseline
          </span>
        </div>

        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-mono uppercase">Battery Health</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400 font-mono">
            98.2%
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            32°C Motor Temp (Optimal)
          </span>
        </div>
      </div>

      {/* Safety Alert if Battery is Low */}
      {!safetyCheck.canAccept && (
        <div className="rounded-2xl p-4 border border-rose-500/50 bg-rose-950/40 text-rose-200 flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div>
            <h4 className="text-xs font-bold font-mono">SMART BATTERY GUARD ACTIVE</h4>
            <p className="text-xs mt-0.5">{safetyCheck.reason}</p>
          </div>
        </div>
      )}

      {/* Nearby Fast Charging Stations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Verified Fast Charging Hubs Nearby</span>
          </h4>
          <span className="text-[11px] font-mono text-zinc-500">
            {nearestStations.length} Stations Online
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {nearestStations.slice(0, 3).map((st) => {
            const isRouting = routingStationId === st.id;

            return (
              <div
                key={st.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4 space-y-3 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      {st.powerKw} kW Fast DC
                    </span>
                    <h5 className="text-xs font-bold text-white mt-1.5 line-clamp-1">
                      {st.name}
                    </h5>
                  </div>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {st.distanceKm} km
                  </span>
                </div>

                <div className="text-[11px] font-mono text-zinc-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Available Stalls:</span>
                    <span className="text-emerald-400 font-bold">
                      {st.availableStalls} / {st.totalStalls} Free
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tariff:</span>
                    <span className="text-white">₹{st.costPerKwh} / kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Connector:</span>
                    <span className="text-zinc-300">{st.connectorType}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRoute(st)}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                    isRouting
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                  }`}
                >
                  {isRouting ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Navigating to Hub...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="h-3.5 w-3.5" />
                      <span>Route to Charger</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
