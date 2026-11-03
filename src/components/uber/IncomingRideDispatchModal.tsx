"use client";

import React, { useEffect, useState } from "react";
import { RideRequest } from "@/lib/uber/types";
import { uberAudio } from "@/lib/uber/soundEffects";
import {
  Navigation,
  MapPin,
  Clock,
  Sparkles,
  Flame,
  CheckCircle2,
  X,
  Star,
  DollarSign,
  ShieldCheck,
} from "lucide-react";

interface IncomingRideDispatchModalProps {
  request: RideRequest | null;
  onAccept: (request: RideRequest) => void;
  onDecline: () => void;
}

export default function IncomingRideDispatchModal({
  request,
  onAccept,
  onDecline,
}: IncomingRideDispatchModalProps) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    if (!request) return;

    setTimeLeft(15);
    // Play authentic Uber dispatch alert chime
    uberAudio.playDispatchAlert();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request]);

  if (!request) return null;

  const progressPercent = (timeLeft / 15) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl border-2 border-cyan-400 bg-zinc-950 p-6 shadow-2xl shadow-cyan-500/20 space-y-5 animate-scaleUp">
        {/* Top Header with Live Countdown Ring */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
            </span>
            <span className="font-mono text-xs font-bold text-cyan-400 tracking-wider">
              NEW RIDE DISPATCH
            </span>
          </div>

          {/* 15-Sec Countdown Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono font-bold text-white">
            <Clock className="h-3.5 w-3.5 text-cyan-400 animate-spin" />
            <span>{timeLeft}s to accept</span>
          </div>
        </div>

        {/* Big Earnings & Surge Hero */}
        <div className="text-center rounded-2xl bg-gradient-to-b from-cyan-950/40 via-zinc-900 to-zinc-900 border border-cyan-500/30 p-4 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            Guaranteed Shift Fare
          </span>
          <div className="text-4xl font-black text-white font-mono flex items-center justify-center gap-1">
            <span>₹{request.fareInr}</span>
          </div>

          {request.surgeBonusInr > 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-extrabold text-xs mt-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              <span>Includes +₹{request.surgeBonusInr} ({request.surgeMultiplier.toFixed(1)}x Surge Bonus)</span>
            </div>
          )}
        </div>

        {/* Rider & Route Info */}
        <div className="space-y-3 bg-zinc-900/60 rounded-2xl border border-zinc-800/80 p-4 text-xs">
          {/* Rider */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                {request.riderName.charAt(0)}
              </div>
              <div>
                <span className="font-bold text-white block">{request.riderName}</span>
                <span className="text-amber-400 text-[10px] flex items-center gap-0.5">
                  ★ {request.riderRating} &bull; Verified Rider
                </span>
              </div>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              {request.paymentMode === "GOOGLE_PAY_UPI" ? "📱 Google Pay" : "💵 Cash"}
            </span>
          </div>

          {/* Pickup & Dropoff Waypoints */}
          <div className="space-y-2 pt-1 font-sans">
            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 mt-1 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-zinc-400 block font-mono">PICKUP (1.2 km away &bull; 4 min)</span>
                <span className="font-semibold text-white truncate block">{request.pickupAddress}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 mt-1 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-zinc-400 block font-mono">
                  DROPOFF ({request.distanceKm} km &bull; ~{request.durationMin} mins)
                </span>
                <span className="font-semibold text-white truncate block">{request.dropoffAddress}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Accept or Decline */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="py-3 px-4 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="h-4 w-4" />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={() => onAccept(request)}
            className="py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs transition-all shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 animate-pulse"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>ACCEPT RIDE</span>
          </button>
        </div>

        {/* Countdown Bar */}
        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
          <div
            className="bg-cyan-400 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
