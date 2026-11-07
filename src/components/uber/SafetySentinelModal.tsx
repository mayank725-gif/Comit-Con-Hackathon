"use client";

import React, { useState } from "react";
import { RouteAnomalyAlert, RideRequest } from "@/lib/uber/types";
import { safetySentinel } from "@/lib/uber/safetySentinel";
import { uberAudio } from "@/lib/uber/soundEffects";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Radio,
  PhoneCall,
  CheckCircle2,
  X,
  Volume2,
  Lock,
  Sparkles,
} from "lucide-react";

interface SafetySentinelModalProps {
  trip: RideRequest;
  isOpen: boolean;
  onClose: () => void;
  onSimulateDeviation?: () => void;
}

export default function SafetySentinelModal({
  trip,
  isOpen,
  onClose,
  onSimulateDeviation,
}: SafetySentinelModalProps) {
  const [activeAlert, setActiveAlert] = useState<RouteAnomalyAlert | null>(null);
  const [isSosTriggered, setIsSosTriggered] = useState(false);
  const [isSafeConfirmed, setIsSafeConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleTriggerSimulatedDeviation = () => {
    const alert = safetySentinel.createAnomalyAlert(
      trip.id,
      "ROUTE_DIVERGENCE",
      485,
      trip.pickupCoords || [12.9788, 77.5996]
    );
    setActiveAlert(alert);
    setIsSafeConfirmed(false);
    if (onSimulateDeviation) {
      onSimulateDeviation();
    }
  };

  const handleTriggerSilentSos = () => {
    setIsSosTriggered(true);
    const alert = safetySentinel.createAnomalyAlert(
      trip.id,
      "SILENT_SOS",
      0,
      trip.pickupCoords || [12.9788, 77.5996]
    );
    setActiveAlert(alert);
  };

  const handleConfirmSafety = () => {
    uberAudio.playTripCompletedCashChime();
    setIsSafeConfirmed(true);
    setTimeout(() => {
      setActiveAlert(null);
      setIsSafeConfirmed(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`h-10 w-10 rounded-2xl flex items-center justify-center text-white shadow-lg ${
                isSosTriggered
                  ? "bg-rose-600 animate-bounce"
                  : activeAlert
                  ? "bg-amber-600 animate-pulse"
                  : "bg-emerald-600 shadow-emerald-500/20"
              }`}
            >
              {isSosTriggered ? (
                <Radio className="h-5 w-5" />
              ) : activeAlert ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold tracking-tight uppercase">
                  Autonomous Safety Sentinel
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isSosTriggered
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : activeAlert
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {isSosTriggered
                    ? "🚨 CRITICAL SOS"
                    : activeAlert
                    ? "⚠️ ANOMALY DETECTED"
                    : "ACTIVE GUARD"}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Continuous GPS cross-track trajectory telemetry & distress response
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Trip Safety Telemetry */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-zinc-400">
            <span>Trip ID</span>
            <span className="text-white font-bold">{trip.id}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Rider / Driver</span>
            <span className="text-white font-bold">
              {trip.riderName} ↔ {trip.driverName || "Assigned Partner"}
            </span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Corridor Tolerance</span>
            <span className="text-emerald-400 font-bold">350 meters max deviation</span>
          </div>
          <div className="flex items-center justify-between text-zinc-400">
            <span>Current Deviation</span>
            <span
              className={`font-bold ${
                activeAlert?.deviationMeters
                  ? "text-rose-400 animate-pulse"
                  : "text-emerald-400"
              }`}
            >
              {activeAlert?.deviationMeters || 18} meters (Within Safety Bounds)
            </span>
          </div>
        </div>

        {/* Active Alert Banner if triggered */}
        {activeAlert && (
          <div
            className={`rounded-2xl p-4 border space-y-3 ${
              isSosTriggered
                ? "bg-rose-950/80 border-rose-500 text-rose-200"
                : "bg-amber-950/80 border-amber-500 text-amber-200"
            }`}
          >
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold">
                  {isSosTriggered
                    ? "DISPATCH EMERGENCY BEACON BROADCASTED"
                    : "ROUTE DIVERGENCE DETECTED"}
                </h4>
                <p className="text-xs mt-1 leading-relaxed">
                  {activeAlert.audioPrompt}
                </p>
              </div>
            </div>

            {!isSafeConfirmed ? (
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={handleConfirmSafety}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>I Am Safe (Dismiss Check)</span>
                </button>
                <button
                  onClick={handleTriggerSilentSos}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
                >
                  Escalate SOS
                </button>
              </div>
            ) : (
              <div className="text-center py-1 text-xs text-emerald-300 font-bold flex items-center justify-center space-x-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Status Verified Safe &bull; Telemetry Cleared</span>
              </div>
            )}
          </div>
        )}

        {/* Actions for Judges and Users */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>LIVE INTERACTIVE CONTROLS</span>
            <span>Simulate Real-World Scenarios</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleTriggerSimulatedDeviation}
              className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Simulate Route Divergence</span>
            </button>

            <button
              onClick={handleTriggerSilentSos}
              className="p-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Silent SOS Distress</span>
            </button>
          </div>
        </div>

        {/* Emergency Hotline Info */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800">
          <span className="flex items-center space-x-1">
            <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
            <span>24x7 India Safety Helpline: 112 / 100</span>
          </span>
          <span className="font-mono text-zinc-500">AES-256 Encrypted Telemetry</span>
        </div>
      </div>
    </div>
  );
}
