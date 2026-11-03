"use client";

import React, { useState, useEffect } from "react";
import { RideRequest } from "@/lib/uber/types";
import { uberAudio } from "@/lib/uber/soundEffects";
import {
  Navigation,
  CheckCircle2,
  Phone,
  ShieldAlert,
  Gauge,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";

interface ActiveTripHUDProps {
  trip: RideRequest;
  onCompleteTrip: (completedTrip: RideRequest) => void;
}

export default function ActiveTripHUD({
  trip,
  onCompleteTrip,
}: ActiveTripHUDProps) {
  const [speedKmh, setSpeedKmh] = useState(48);
  const [remainingKm, setRemainingKm] = useState(trip.distanceKm);
  const [hasCalledRider, setHasCalledRider] = useState(false);

  // Live speedometer and distance ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeedKmh(Math.floor(Math.random() * 20) + 38);
      setRemainingKm((prev) => Math.max(1, +(prev - 0.2).toFixed(1)));
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  const handleFinish = () => {
    // Play celebratory cash chime
    uberAudio.playTripCompletedCashChime();
    onCompleteTrip(trip);
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/70 bg-zinc-950/98 p-4 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-3">
      {/* Top Status Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-extrabold text-xs text-emerald-400 tracking-wide uppercase font-mono">
            TRIP IN PROGRESS &bull; LIVE METER
          </span>
        </div>

        {/* Live Running Meter & Speed */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-300">
            <Gauge className="h-3.5 w-3.5 text-cyan-400" />
            <span>{speedKmh} km/h</span>
          </div>

          <div className="flex items-baseline gap-1 text-xs font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg">
            <span>₹{trip.fareInr}</span>
          </div>
        </div>
      </div>

      {/* Rider & Destination Details */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        {/* Rider Profile */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 border border-indigo-400 flex items-center justify-center font-bold text-white text-sm shrink-0">
            {trip.riderName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-white text-sm">{trip.riderName}</span>
              <span className="text-[10px] text-amber-400 font-bold">★ {trip.riderRating}</span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              Destination: <strong className="text-zinc-200">{trip.dropoffAddress}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setHasCalledRider(true)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium flex items-center gap-1 transition-colors"
          >
            <Phone className="h-3.5 w-3.5 text-cyan-400" />
            <span>{hasCalledRider ? "Calling..." : "Call Rider"}</span>
          </button>

          <button
            type="button"
            onClick={handleFinish}
            className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Complete Trip &amp; Collect ₹{trip.fareInr}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
