"use client";

import React, { useState } from "react";
import { PredictiveSurgeHotspot } from "@/lib/uber/types";
import { PREDICTIVE_SURGE_RADAR_DATA, predictiveEngine } from "@/lib/uber/predictiveEngine";
import { uberAudio } from "@/lib/uber/soundEffects";
import {
  Compass,
  TrendingUp,
  Clock,
  Sparkles,
  Navigation,
  Flame,
  Radio,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface PredictiveRepositioningHUDProps {
  driverCoords?: [number, number];
  onRepositionSelect?: (hotspot: PredictiveSurgeHotspot) => void;
}

export default function PredictiveRepositioningHUD({
  driverCoords = [12.9788, 77.5996],
  onRepositionSelect,
}: PredictiveRepositioningHUDProps) {
  const [selectedHotspot, setSelectedHotspot] = useState<PredictiveSurgeHotspot>(
    PREDICTIVE_SURGE_RADAR_DATA[0]
  );
  const [activeRepositioning, setActiveRepositioning] = useState<string | null>(null);

  const benefit = predictiveEngine.calculateRepositionBenefit(
    driverCoords,
    selectedHotspot
  );

  const handleStartReposition = (hotspot: PredictiveSurgeHotspot) => {
    uberAudio.playRadarPingTone();
    setActiveRepositioning(hotspot.id);
    if (onRepositionSelect) {
      onRepositionSelect(hotspot);
    }
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-xl p-5 shadow-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold tracking-tight text-white uppercase">
                Michelangelo Predictive Radar
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                15-30m Forecast
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Machine Learning anticipatory repositioning ahead of demand spikes
            </p>
          </div>
        </div>
      </div>

      {/* Hotspots Carousel / List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PREDICTIVE_SURGE_RADAR_DATA.slice(0, 3).map((spot) => {
          const isSelected = selectedHotspot.id === spot.id;
          const isEnRoute = activeRepositioning === spot.id;

          return (
            <div
              key={spot.id}
              onClick={() => setSelectedHotspot(spot)}
              className={`cursor-pointer rounded-2xl p-3.5 border transition-all ${
                isSelected
                  ? "bg-zinc-900 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40"
                  : "bg-zinc-900/50 border-zinc-800/60 hover:bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  {spot.city}
                </span>
                <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                  <Flame className="h-3.5 w-3.5 text-amber-400 inline" />
                  <span>{spot.predictedSurge}x Peak</span>
                </span>
              </div>

              <h4 className="text-xs font-semibold text-white truncate mb-1">
                {spot.zoneName}
              </h4>
              <p className="text-[11px] text-zinc-400 line-clamp-1 mb-2">
                {spot.catalyst}
              </p>

              <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-zinc-800/80">
                <span className="text-zinc-400 flex items-center space-x-1">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  <span>Peaks in {spot.timeToPeakMin}m</span>
                </span>
                <span className="text-emerald-400 font-bold">
                  +{spot.earningsBoostPercent}% Yield
                </span>
              </div>

              {isEnRoute && (
                <div className="mt-2 text-[10px] font-mono py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 text-center flex items-center justify-center space-x-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  <span>REPOSITIONING ACTIVE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Hotspot Intelligence Brief */}
      <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950/90 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-bold text-white">
                {selectedHotspot.zoneName}
              </h4>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              {selectedHotspot.catalyst}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                Estimated Bonus
              </span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                +₹{benefit.estimatedExtraInr} / trip
              </span>
            </div>
            <button
              onClick={() => handleStartReposition(selectedHotspot)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-amber-500/20 flex items-center space-x-2 transition-transform active:scale-95"
            >
              <Navigation className="h-3.5 w-3.5" />
              <span>Reposition Fleet Here</span>
            </button>
          </div>
        </div>

        {/* Reposition Math Telemetry Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80 text-xs font-mono">
          <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">Distance</span>
            <span className="text-white font-bold">{benefit.distanceKm} km</span>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">Transit ETA</span>
            <span className="text-cyan-400 font-bold">~{benefit.etaMin} mins</span>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">ML Confidence</span>
            <span className="text-purple-400 font-bold">{selectedHotspot.confidenceScore}%</span>
          </div>
          <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/60">
            <span className="text-zinc-500 block text-[10px]">Predicted Surge</span>
            <span className="text-amber-400 font-bold">{selectedHotspot.predictedSurge}x Surge</span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-400 italic">
          💡 {benefit.recommendation}
        </p>
      </div>
    </div>
  );
}
