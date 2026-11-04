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
  KeyRound,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface ActiveTripHUDProps {
  trip: RideRequest;
  onCompleteTrip: (completedTrip: RideRequest) => void;
}

export default function ActiveTripHUD({
  trip,
  onCompleteTrip,
}: ActiveTripHUDProps) {
  // Phase 1: DRIVING_TO_PICKUP -> Phase 2: VERIFY_OTP -> Phase 3: IN_TRANSIT
  const [phase, setPhase] = useState<"TO_PICKUP" | "VERIFY_OTP" | "IN_TRANSIT">("TO_PICKUP");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState(false);
  const [speedKmh, setSpeedKmh] = useState(48);
  const [remainingKm, setRemainingKm] = useState(trip.distanceKm);
  const [hasCalledRider, setHasCalledRider] = useState(false);

  // Live speedometer and distance ticker
  useEffect(() => {
    if (phase !== "IN_TRANSIT") return;

    const interval = setInterval(() => {
      setSpeedKmh(Math.floor(Math.random() * 20) + 38);
      setRemainingKm((prev) => Math.max(1, +(prev - 0.2).toFixed(1)));
    }, 1200);

    return () => clearInterval(interval);
  }, [phase]);

  const handleArrivedAtPickup = () => {
    setPhase("VERIFY_OTP");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    // Allow any 4-digit number for seamless testing
    if (enteredOtp.length === 4) {
      setOtpError(false);
      setPhase("IN_TRANSIT");
      uberAudio.playDispatchAlert();
    } else {
      setOtpError(true);
    }
  };

  const handleFinish = () => {
    // Play celebratory cash chime
    uberAudio.playTripCompletedCashChime();
    onCompleteTrip(trip);
  };

  return (
    <div className="rounded-3xl border-2 border-emerald-500/70 bg-zinc-950 p-5 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-4">
      {/* Top Status Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-extrabold text-xs text-emerald-400 tracking-wide uppercase font-mono">
            {phase === "TO_PICKUP" && "PHASE 1: DRIVING TO PICKUP"}
            {phase === "VERIFY_OTP" && "PHASE 2: VERIFY PASSENGER OTP"}
            {phase === "IN_TRANSIT" && "PHASE 3: TRIP IN PROGRESS • LIVE METER"}
          </span>
        </div>

        {/* Live Running Meter & Speed */}
        <div className="flex items-center gap-3">
          {phase === "IN_TRANSIT" && (
            <div className="flex items-center gap-1 text-xs font-mono text-zinc-300">
              <Gauge className="h-3.5 w-3.5 text-zinc-300" />
              <span>{speedKmh} km/h</span>
            </div>
          )}

          <div className="flex items-baseline gap-1 text-xs font-mono font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl">
            <span>Guaranteed Fare: ₹{trip.fareInr}</span>
          </div>
        </div>
      </div>

      {/* PHASE 1: DRIVING TO PICKUP */}
      {phase === "TO_PICKUP" && (
        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 block font-mono">PICKUP PASSENGER AT:</span>
              <h4 className="text-sm font-extrabold text-white mt-0.5">{trip.pickupAddress}</h4>
              <span className="text-zinc-400 text-[11px] block mt-0.5">
                Rider: <strong>{trip.riderName}</strong> (★ {trip.riderRating}) &bull; ~1.2 km away
              </span>
            </div>

            <button
              type="button"
              onClick={() => setHasCalledRider(true)}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-emerald-400" />
              <span>{hasCalledRider ? "Calling..." : "Call Rider"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleArrivedAtPickup}
            className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <MapPin className="h-4 w-4" />
            <span>I'VE ARRIVED AT PICKUP LOCATION</span>
          </button>
        </div>
      )}

      {/* PHASE 2: VERIFY RIDER'S 4-DIGIT PIN / OTP */}
      {phase === "VERIFY_OTP" && (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-amber-400 font-bold">
              <KeyRound className="h-4 w-4" />
              <span>Ask {trip.riderName} for 4-Digit Security PIN</span>
            </div>
            <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
              Verify the rider's PIN from their Uber app before unlocking ignition and starting the meter.
            </p>

            <form onSubmit={handleVerifyOtp} className="flex flex-col items-center gap-3 pt-2">
              <input
                type="text"
                maxLength={4}
                value={enteredOtp}
                onChange={(e) => {
                  setEnteredOtp(e.target.value.replace(/\D/g, ""));
                  setOtpError(false);
                }}
                placeholder="4-digit PIN (e.g. 5829)"
                className="w-48 text-center text-xl font-black font-mono tracking-widest bg-zinc-950 border border-zinc-700 rounded-xl py-2 px-3 text-white focus:outline-none focus:border-white"
              />

              {otpError && (
                <span className="text-[11px] text-rose-400 font-semibold">
                  Please enter a valid 4-digit PIN.
                </span>
              )}

              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-md flex items-center gap-2"
              >
                <span>Verify PIN &amp; Start Trip</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PHASE 3: IN TRANSIT TO DESTINATION */}
      {phase === "IN_TRANSIT" && (
        <div className="space-y-4 text-xs">
          {/* Turn-by-Turn Instruction Banner */}
          <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base shrink-0">
                &uarr;
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-mono">TURN-BY-TURN NAVIGATION</span>
                <span className="font-extrabold text-white text-xs block">
                  In 350m, take the elevated flyover towards Airport Expressway
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-emerald-400 block font-mono">{remainingKm} km</span>
              <span className="text-[10px] text-zinc-400 font-mono">~32 mins</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-zinc-300">
            <div>
              <span className="text-[10px] text-zinc-400 block font-mono">FINAL DESTINATION</span>
              <span className="font-bold text-white text-xs">{trip.dropoffAddress}</span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 animate-pulse"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete Trip &amp; Collect ₹{trip.fareInr}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
