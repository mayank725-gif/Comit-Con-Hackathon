"use client";

import React, { useState } from "react";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import { uberAudio } from "@/lib/uber/soundEffects";
import {
  Navigation,
  ChevronDown,
  ChevronUp,
  Zap,
  Settings,
  Car,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Flame,
  Power,
  Banknote,
  Sparkles,
  Sliders,
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

const HIGH_YIELD_HOTSPOTS = [
  {
    name: "M. Chinnaswamy Stadium & MG Road CBD",
    coords: [12.9788, 77.5996] as [number, number],
    surge: "3.5x",
    avgFare: "₹450-₹700",
    deficit: "+140 riders",
    type: "Stadium / Event Surge",
  },
  {
    name: "Bellandur Outer Ring Road Tech Corridor",
    coords: [12.9260, 77.6762] as [number, number],
    surge: "2.8x",
    avgFare: "₹380-₹550",
    deficit: "+85 riders",
    type: "Corporate Evening Rush",
  },
  {
    name: "Kempegowda Int'l Airport (BLR T2)",
    coords: [13.1986, 77.7066] as [number, number],
    surge: "2.2x",
    avgFare: "₹850-₹1,200",
    deficit: "+90 riders",
    type: "Guaranteed Long-Haul",
  },
];

export default function DriverSectorSpotlight({
  user,
  profile,
  sectorTelemetry,
  onFlyToMySector,
  onOpenTerritoryModal,
  onSimulateDispatch,
}: DriverSectorSpotlightProps) {
  const [isOnDuty, setIsOnDuty] = useState(true);
  const [isLedgerExpanded, setIsLedgerExpanded] = useState(false);
  const [isCashoutModalOpen, setIsCashoutModalOpen] = useState(false);
  const [hasCashedOut, setHasCashedOut] = useState(false);

  // Driver Shift Preferences
  const [autoAcceptSurge, setAutoAcceptSurge] = useState(true);
  const [airportPriority, setAirportPriority] = useState(false);
  const [digitalUpiOnly, setDigitalUpiOnly] = useState(true);

  // Unauthenticated Clean State
  if (!profile) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
            <Car className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base text-white">Driver Partner Pro</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                Commercial Fleet Access
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Sign in with your verified driver credentials or select commercial partner profile to start your shift.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTerritoryModal}
          className="shrink-0 px-5 py-3 rounded-2xl bg-white hover:bg-zinc-100 text-black font-black text-xs shadow-xl transition-all flex items-center gap-2"
        >
          <span>Driver Partner Sign-In</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Financial Ledger Calculations
  const grossShiftEarnings = profile.currentEarnings || 3120;
  const platformFee = Math.round(grossShiftEarnings * 0.2); // 20% Uber fee
  const tollReimbursements = 120;
  const estimatedFuelCng = 420;
  const netTakeHome = grossShiftEarnings - platformFee + tollReimbursements - estimatedFuelCng;
  const target = profile.dailyEarningsTarget || 3500;
  const progressPercent = Math.min(100, Math.round((grossShiftEarnings / target) * 100));

  const handleToggleDuty = () => {
    setIsOnDuty(!isOnDuty);
    uberAudio.playDispatchAlert();
  };

  const handleInstantCashout = () => {
    uberAudio.playBankPayoutChime();
    setHasCashedOut(true);
    setIsCashoutModalOpen(true);
  };

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden transition-all space-y-4 p-5">
      {/* SECTION 1: THE ICONIC CIRCULAR "GO" ONLINE / OFFLINE HERO BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        {/* Left: Driver Identity & Vehicle */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={profile.driverName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-lg shrink-0">
              {profile.driverName.charAt(0)}
            </div>
          )}

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-white truncate">{profile.driverName}</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">★ 4.93</span>
            </div>
            <p className="text-xs text-zinc-300 font-medium truncate mt-0.5">
              {profile.vehicleModel}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-mono font-black text-[10px] tracking-wider">
                {profile.licensePlate}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                {profile.cityName} &bull; Custom DB Synced
              </span>
            </div>
          </div>
        </div>

        {/* Center: The Iconic Uber "GO" Online/Offline Button */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleToggleDuty}
              className={`relative flex items-center justify-center w-16 h-16 rounded-full font-black text-sm tracking-wider transition-all shadow-2xl ${
                isOnDuty
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black ring-4 ring-emerald-500/30 shadow-emerald-500/40"
                  : "bg-white hover:bg-zinc-200 text-black ring-4 ring-zinc-700 shadow-white/20"
              }`}
            >
              {isOnDuty ? "ONLINE" : "GO"}
            </button>
            <span className="text-[10px] font-mono font-bold mt-1.5 text-zinc-400">
              {isOnDuty ? "Tap to Go Offline" : "Tap to Go Online"}
            </span>
          </div>

          <div className="hidden sm:block text-left border-l border-zinc-800 pl-4 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isOnDuty ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className="text-xs font-bold text-white">
                {isOnDuty ? "YOU'RE ONLINE" : "YOU'RE OFFLINE"}
              </span>
            </div>
            <span className="text-[11px] text-zinc-400 block max-w-xs truncate">
              {isOnDuty
                ? `Priority dispatch active in ${profile.primaryZoneName.split("&")[0].trim()}`
                : "Go online to start receiving dispatch requests"}
            </span>
            {isOnDuty && (
              <span className="text-[10px] font-mono text-amber-400 font-bold block">
                ⚡ {sectorTelemetry?.surgeMultiplier || 3.5}x Surge Active in Sector
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => onFlyToMySector(profile.assignedCoordinates || [12.9788, 77.5980])}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black transition-all flex items-center gap-1.5 shadow-md shrink-0"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Center My Car</span>
          </button>

          {onSimulateDispatch && (
            <button
              type="button"
              onClick={onSimulateDispatch}
              title="Simulate an incoming passenger ride request"
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
            >
              <span>🔔 Test Dispatch</span>
            </button>
          )}

          <button
            onClick={onOpenTerritoryModal}
            title="Update Work Territory or Vehicle"
            className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:text-white transition-all shrink-0"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SECTION 2: BUSINESS SHIFT FINANCIAL LEDGER & INSTANT CASHOUT HERO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Gross Shift Fares */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 space-y-1">
          <span className="text-[10px] text-zinc-400 font-mono uppercase block">Gross Shift Revenue</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">₹{grossShiftEarnings}</span>
            <span className="text-[10px] text-emerald-400 font-bold">{progressPercent}% goal</span>
          </div>
          <span className="text-[10px] text-zinc-500 block">Target: ₹{target}</span>
        </div>

        {/* KPI 2: Net Driver Take-Home */}
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 space-y-1">
          <span className="text-[10px] text-emerald-400 font-mono uppercase block">Net Take-Home Pay</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400 font-mono">₹{netTakeHome}</span>
            <span className="text-[10px] text-zinc-400 font-mono">Post-fees</span>
          </div>
          <span className="text-[10px] text-emerald-400/80 block">After fuel &amp; 20% platform cut</span>
        </div>

        {/* KPI 3: Dynamic Surge Bonus */}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3.5 space-y-1">
          <span className="text-[10px] text-amber-400 font-mono uppercase block">Surge Incentive Earned</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400 font-mono">+₹640</span>
            <span className="text-[10px] text-amber-300 font-bold">Bonus</span>
          </div>
          <span className="text-[10px] text-zinc-400 block truncate">From high-yield zone trips</span>
        </div>

        {/* KPI 4: Instant Cashout Action */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
            <span>DIRECT BANK PAYOUT</span>
            <span className="text-emerald-400">IMPS Fast</span>
          </div>

          <button
            type="button"
            onClick={handleInstantCashout}
            className="w-full mt-2 py-2 px-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
          >
            <Banknote className="h-3.5 w-3.5 text-black" />
            <span>Cash Out ₹{netTakeHome}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: COMMERCIAL FLEET HIGH-YIELD SURGE RADAR & SETTINGS */}
      <div className="pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-extrabold text-white">Commercial Fleet Surge Radar</span>
            <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">&bull; High-demand repositioning targets</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-bold"
          >
            <span>{isLedgerExpanded ? "Hide Details" : "View Shift Ledger & Hotspots"}</span>
            {isLedgerExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expandable Shift Ledger Drawer */}
        {isLedgerExpanded && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-4 animate-fadeIn text-xs">
            {/* Hotspots Radar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {HIGH_YIELD_HOTSPOTS.map((hotspot) => (
                <div
                  key={hotspot.name}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 uppercase block">{hotspot.type}</span>
                      <h5 className="font-extrabold text-white text-xs mt-0.5 truncate max-w-[180px]">{hotspot.name}</h5>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-xs">
                      {hotspot.surge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-300">
                    <span>Avg Fare: <strong>{hotspot.avgFare}</strong></span>
                    <span className="text-emerald-400 font-mono">{hotspot.deficit}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onFlyToMySector(hotspot.coords)}
                    className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Navigate GPS Here</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Shift Preferences Row */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-white text-xs">Commercial Shift Preferences:</span>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoAcceptSurge}
                    onChange={(e) => setAutoAcceptSurge(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-400 focus:ring-0"
                  />
                  <span>⚡ Auto-Accept Surge (&gt;1.5x)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={airportPriority}
                    onChange={(e) => setAirportPriority(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-400 focus:ring-0"
                  />
                  <span>✈️ Airport Exclusive</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={digitalUpiOnly}
                    onChange={(e) => setDigitalUpiOnly(e.target.checked)}
                    className="rounded bg-zinc-800 border-zinc-700 text-emerald-400 focus:ring-0"
                  />
                  <span>💳 Digital UPI Only</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CASHOUT CONFIRMATION MODAL */}
      {isCashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-emerald-400 text-2xl">
              ✓
            </div>
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                IMPS TRANSFER SUCCESSFUL
              </span>
              <h4 className="text-xl font-black text-white mt-1">₹{netTakeHome} Deposited</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Transferred to HDFC Bank A/C ending in **4092. Transaction Reference: IMPS/2026/UBER/{Date.now().toString().slice(-6)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCashoutModalOpen(false)}
              className="w-full py-3 rounded-xl bg-white text-black font-black text-xs hover:bg-zinc-200 transition-colors"
            >
              Done &bull; Return to Shift
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
