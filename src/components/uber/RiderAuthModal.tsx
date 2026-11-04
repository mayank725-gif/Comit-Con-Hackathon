"use client";

import React, { useState } from "react";
import {
  User,
  Phone,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Car,
  X,
} from "lucide-react";

export interface RiderUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar: string;
  rating: number;
  profileType: "PERSONAL" | "BUSINESS";
  gstin?: string;
  tripsTaken: number;
}

interface RiderAuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  currentRider: RiderUser | null;
  onAuthSuccess: (rider: RiderUser) => void;
  canClose?: boolean;
}

const PRESET_RIDERS: RiderUser[] = [
  {
    id: "RIDER-AMAN",
    name: "Aman Gupta",
    phone: "+91 98765 43210",
    email: "aman.gupta@outlook.com",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    rating: 4.95,
    profileType: "PERSONAL",
    tripsTaken: 42,
  },
  {
    id: "RIDER-PRIYA",
    name: "Priya Sharma",
    phone: "+91 98451 22334",
    email: "priya.sharma@techcorp.in",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    rating: 4.98,
    profileType: "BUSINESS",
    gstin: "29AABCT1332L1ZV",
    tripsTaken: 68,
  },
  {
    id: "RIDER-VIKRAM",
    name: "Vikram Malhotra",
    phone: "+91 99112 33445",
    email: "vikram.m@innovate.co",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 4.92,
    profileType: "BUSINESS",
    gstin: "27AAACW5829H1Z0",
    tripsTaken: 115,
  },
];

export default function RiderAuthModal({
  isOpen,
  onClose,
  currentRider,
  onAuthSuccess,
  canClose = false,
}: RiderAuthModalProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("RIDER-AMAN");
  const [customName, setCustomName] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [profileType, setProfileType] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [gstin, setGstin] = useState("");

  if (!isOpen) return null;

  const handleSelectPreset = (preset: RiderUser) => {
    setSelectedPresetId(preset.id);
    setIsCustomMode(false);
  };

  const handleContinue = () => {
    let rider: RiderUser;
    if (isCustomMode && customName && customPhone) {
      rider = {
        id: `RIDER-${Date.now().toString().slice(-4)}`,
        name: customName,
        phone: customPhone.startsWith("+91") ? customPhone : `+91 ${customPhone}`,
        email: `${customName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
        rating: 4.96,
        profileType,
        gstin: profileType === "BUSINESS" ? (gstin || "29AABCT1332L1ZV") : undefined,
        tripsTaken: 1,
      };
    } else {
      rider = PRESET_RIDERS.find((p) => p.id === selectedPresetId) || PRESET_RIDERS[0];
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("uber_rider_user", JSON.stringify(rider));
    }

    onAuthSuccess(rider);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-black text-sm">
              U
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>Rider Sign In</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                  Mandatory Access
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Sign in to book rides, lock upfront pricing, and track trip history.
              </p>
            </div>
          </div>

          {canClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 1-Click Instant Demo Profiles */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
            1-Click Verified Rider Profiles (Demo)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRESET_RIDERS.map((preset) => {
              const isSelected = !isCustomMode && selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-950/30 shadow-lg shadow-emerald-500/10"
                      : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <img
                      src={preset.avatar}
                      alt={preset.name}
                      className="w-8 h-8 rounded-full object-cover border border-zinc-700"
                    />
                    {isSelected && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-white block truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block">
                      ★ {preset.rating} &bull; {preset.profileType}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Or Custom Mobile Sign In Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsCustomMode(!isCustomMode)}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>{isCustomMode ? "← Use preset profile" : "+ Or enter custom name & mobile number"}</span>
          </button>
        </div>

        {isCustomMode && (
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-3 animate-fadeIn text-xs">
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1">Your Full Name</label>
              <input
                type="text"
                placeholder="e.g. Aman Gupta"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-zinc-400 block mb-1">Mobile Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-white font-mono"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="customProfileType"
                  checked={profileType === "PERSONAL"}
                  onChange={() => setProfileType("PERSONAL")}
                  className="accent-white"
                />
                <span className="text-zinc-300">Personal Travel</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="customProfileType"
                  checked={profileType === "BUSINESS"}
                  onChange={() => setProfileType("BUSINESS")}
                  className="accent-white"
                />
                <span className="text-zinc-300">Business (GST Invoice)</span>
              </label>
            </div>
            {profileType === "BUSINESS" && (
              <div>
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">Company GSTIN</label>
                <input
                  type="text"
                  placeholder="29AABCT1332L1ZV"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono text-xs uppercase"
                />
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          onClick={handleContinue}
          className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <span>Continue to Rider Portal</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Local persistent session &bull; Zero external cloud dependency</span>
        </div>
      </div>
    </div>
  );
}
