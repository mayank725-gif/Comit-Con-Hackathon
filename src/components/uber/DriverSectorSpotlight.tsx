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
  isOnDuty?: boolean;
  onToggleDuty?: () => void;
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
  isOnDuty: propIsOnDuty,
  onToggleDuty,
}: DriverSectorSpotlightProps) {
  const [localOnDuty, setLocalOnDuty] = useState(true);
  const isOnDuty = typeof propIsOnDuty === "boolean" ? propIsOnDuty : localOnDuty;
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
      <div className="rounded-[28px] border border-[#e2e6de] bg-white p-5 safar-card-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[#193c34]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-full bg-[#ecf1e8] border border-[#193c34]/20 flex items-center justify-center text-[#193c34] shrink-0">
            <Car className="h-6 w-6 text-[#193c34]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#193c34]">Driver Partner Portal</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#ecf1e8] text-[#193c34] font-semibold">
                Commercial Fleet Access
              </span>
            </div>
            <p className="text-xs text-[#6b7a74] mt-0.5">
              Sign in with your verified driver credentials or select commercial partner profile to start your shift.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenTerritoryModal}
          className="shrink-0 px-5 py-2.5 rounded-full bg-[#193c34] hover:bg-[#122c26] text-white font-semibold text-xs safar-card-shadow transition-all flex items-center gap-2"
        >
          <span>Driver Partner Sign-In</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Financial Ledger Calculations
  const grossShiftEarnings = typeof profile.currentEarnings === "number" ? profile.currentEarnings : 3120;
  const platformFee = Math.round(grossShiftEarnings * 0.2); // 20% Uber fee
  const tollReimbursements = grossShiftEarnings > 0 ? 120 : 0;
  const estimatedFuelCng = grossShiftEarnings > 0 ? 420 : 0;
  const netTakeHome = Math.max(0, grossShiftEarnings - platformFee + tollReimbursements - estimatedFuelCng);
  const target = profile.dailyEarningsTarget || 3500;
  const progressPercent = Math.min(100, Math.round((grossShiftEarnings / target) * 100));

  const handleToggleDuty = () => {
    if (onToggleDuty) {
      onToggleDuty();
    } else {
      setLocalOnDuty(!localOnDuty);
    }
    uberAudio.playDispatchAlert();
  };

  const handleInstantCashout = () => {
    uberAudio.playBankPayoutChime();
    setHasCashedOut(true);
    setIsCashoutModalOpen(true);
  };

  return (
    <div className="rounded-[28px] border border-[#e2e6de] bg-white safar-card-shadow overflow-hidden transition-all space-y-4 p-5 text-[#193c34]">
      {/* SECTION 1: THE ICONIC CIRCULAR "GO" ONLINE / OFFLINE HERO BAR */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-[#e2e6de] pb-5">
        {/* Left: Driver Identity & Vehicle */}
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={profile.driverName}
              className="w-14 h-14 rounded-full object-cover border border-[#193c34]/20 safar-card-shadow shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#ecf1e8] border border-[#193c34]/20 flex items-center justify-center font-bold text-[#193c34] text-lg shrink-0">
              {profile.driverName.charAt(0)}
            </div>
          )}

          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#193c34] truncate">{profile.driverName}</span>
              <span className="text-[11px] font-bold text-[#f87746]">★ 4.93</span>
            </div>
            <p className="text-xs text-[#6b7a74] font-medium truncate mt-0.5">
              {profile.vehicleModel}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-mono font-bold text-[10px] tracking-wider">
                {profile.licensePlate}
              </span>
              <span className="text-[10px] text-[#6b7a74]">
                {profile.cityName} &bull; Synced
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
              className={`relative flex items-center justify-center w-16 h-16 rounded-full font-bold text-sm tracking-wider transition-all safar-card-shadow ${
                isOnDuty
                  ? "bg-[#193c34] hover:bg-[#122c26] text-white ring-4 ring-[#193c34]/20"
                  : "bg-white hover:bg-[#fafaf6] text-[#193c34] border border-[#e2e6de] ring-4 ring-[#e2e6de]"
              }`}
            >
              {isOnDuty ? "ONLINE" : "GO"}
            </button>
            <span className="text-[10px] font-medium mt-1.5 text-[#6b7a74]">
              {isOnDuty ? "Tap to Go Offline" : "Tap to Go Online"}
            </span>
          </div>

          <div className="hidden sm:block text-left border-l border-[#e2e6de] pl-4 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isOnDuty ? "bg-[#193c34] animate-pulse" : "bg-[#6b7a74]"}`} />
              <span className="text-xs font-bold text-[#193c34]">
                {isOnDuty ? "YOU'RE ONLINE" : "YOU'RE OFFLINE"}
              </span>
            </div>
            <span className="text-[11px] text-[#6b7a74] block max-w-xs truncate">
              {isOnDuty
                ? `Priority dispatch active in ${profile.primaryZoneName.split("&")[0].trim()}`
                : "Go online to start receiving dispatch requests"}
            </span>
            {isOnDuty && (
              <span className="text-[10px] font-mono text-[#f87746] font-bold block">
                ⚡ {sectorTelemetry?.surgeMultiplier || 3.5}x Surge Active in Sector
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => onFlyToMySector(profile.assignedCoordinates || [12.9788, 77.5980])}
            className="px-4 py-2 rounded-full bg-[#193c34] hover:bg-[#122c26] text-white text-xs font-semibold transition-all flex items-center gap-1.5 safar-card-shadow shrink-0"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Center My Car</span>
          </button>

          <button
            onClick={onOpenTerritoryModal}
            title="Update Work Territory or Vehicle"
            className="p-2.5 rounded-full bg-white hover:bg-[#ecf1e8] text-[#193c34] border border-[#e2e6de] transition-all shrink-0 safar-card-shadow"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* SECTION 2: BUSINESS SHIFT FINANCIAL LEDGER & INSTANT CASHOUT HERO */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Gross Shift Fares */}
        <div className="rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9] p-3.5 space-y-1">
          <span className="text-[10px] text-[#6b7a74] font-medium uppercase block">Gross Revenue</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#193c34] font-mono">₹{grossShiftEarnings}</span>
            <span className="text-[10px] text-[#193c34] font-semibold">{progressPercent}% goal</span>
          </div>
          <span className="text-[10px] text-[#6b7a74] block">Target: ₹{target}</span>
        </div>

        {/* KPI 2: Net Driver Take-Home */}
        <div className="rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9] p-3.5 space-y-1">
          <span className="text-[10px] text-[#193c34] font-semibold uppercase block">Net Take-Home Pay</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#193c34] font-mono">₹{netTakeHome}</span>
            <span className="text-[10px] text-[#6b7a74] font-mono">Post-fees</span>
          </div>
          <span className="text-[10px] text-[#6b7a74] block">After fuel &amp; 20% platform cut</span>
        </div>

        {/* KPI 3: Dynamic Surge Bonus */}
        <div className="rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9] p-3.5 space-y-1">
          <span className="text-[10px] text-[#f87746] font-semibold uppercase block">Surge Incentive Earned</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-[#f87746] font-mono">+₹640</span>
            <span className="text-[10px] text-[#f87746] font-bold">Bonus</span>
          </div>
          <span className="text-[10px] text-[#6b7a74] block truncate">From high-yield zone trips</span>
        </div>

        {/* KPI 4: Instant Cashout Action */}
        <div className="rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9] p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#6b7a74]">
            <span>DIRECT BANK PAYOUT</span>
            <span className="text-[#193c34] font-semibold">IMPS Fast</span>
          </div>

          <button
            type="button"
            onClick={handleInstantCashout}
            className="w-full mt-2 py-2 px-2.5 rounded-full bg-[#f87746] hover:bg-[#e06334] text-white font-bold text-xs transition-all safar-card-shadow flex items-center justify-center gap-1.5 shadow-md shadow-[#f87746]/20"
          >
            <Banknote className="h-3.5 w-3.5 text-white" />
            <span>Cash Out ₹{netTakeHome}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: COMMERCIAL FLEET HIGH-YIELD SURGE RADAR & SETTINGS */}
      <div className="pt-2 border-t border-[#e2e6de]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#f87746]" />
            <span className="text-xs font-bold text-[#193c34]">Surge Hotspots Radar</span>
            <span className="text-[11px] text-[#6b7a74] hidden sm:inline">&bull; High-demand repositioning targets</span>
          </div>

          <button
            type="button"
            onClick={() => setIsLedgerExpanded(!isLedgerExpanded)}
            className="text-xs text-[#6b7a74] hover:text-[#193c34] flex items-center gap-1 font-semibold"
          >
            <span>{isLedgerExpanded ? "Hide Details" : "View Hotspots & Settings"}</span>
            {isLedgerExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Expandable Shift Ledger Drawer */}
        {isLedgerExpanded && (
          <div className="mt-3 pt-3 border-t border-[#e2e6de] space-y-4 animate-fadeIn text-xs text-[#193c34]">
            {/* Hotspots Radar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {HIGH_YIELD_HOTSPOTS.map((hotspot) => (
                <div
                  key={hotspot.name}
                  className="rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9] p-3.5 space-y-2 safar-card-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] text-[#6b7a74] uppercase block font-medium">{hotspot.type}</span>
                      <h5 className="font-bold text-[#193c34] text-xs mt-0.5 truncate max-w-[180px]">{hotspot.name}</h5>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#f87746]/10 text-[#f87746] font-bold text-xs">
                      {hotspot.surge}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#6b7a74]">
                    <span>Avg: <strong className="text-[#193c34]">{hotspot.avgFare}</strong></span>
                    <span className="text-[#193c34] font-medium">{hotspot.deficit}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onFlyToMySector(hotspot.coords)}
                    className="w-full py-2 rounded-full bg-[#193c34] hover:bg-[#122c26] text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 safar-card-shadow"
                  >
                    <Navigation className="h-3 w-3" />
                    <span>Navigate GPS Here</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Shift Preferences Row */}
            <div className="rounded-2xl border border-[#e2e6de] bg-[#fbfbf9] p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="font-bold text-[#193c34] text-xs">Shift Preferences:</span>

              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#6b7a74] hover:text-[#193c34]">
                  <input
                    type="checkbox"
                    checked={autoAcceptSurge}
                    onChange={(e) => setAutoAcceptSurge(e.target.checked)}
                    className="rounded border-[#e2e6de] text-[#193c34] focus:ring-0"
                  />
                  <span>⚡ Auto-Accept Surge (&gt;1.5x)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[#6b7a74] hover:text-[#193c34]">
                  <input
                    type="checkbox"
                    checked={airportPriority}
                    onChange={(e) => setAirportPriority(e.target.checked)}
                    className="rounded border-[#e2e6de] text-[#193c34] focus:ring-0"
                  />
                  <span>✈️ Airport Exclusive</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[#6b7a74] hover:text-[#193c34]">
                  <input
                    type="checkbox"
                    checked={digitalUpiOnly}
                    onChange={(e) => setDigitalUpiOnly(e.target.checked)}
                    className="rounded border-[#e2e6de] text-[#193c34] focus:ring-0"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-[28px] border border-[#e2e6de] bg-white p-6 text-center space-y-4 safar-card-shadow text-[#193c34]">
            <div className="w-14 h-14 rounded-full bg-[#ecf1e8] text-[#193c34] mx-auto flex items-center justify-center text-xl font-bold">
              ✓
            </div>
            <div>
              <span className="text-[10px] text-[#193c34] uppercase font-bold tracking-wider">
                IMPS TRANSFER SUCCESSFUL
              </span>
              <h4 className="text-xl font-bold text-[#193c34] mt-1">₹{netTakeHome} Deposited</h4>
              <p className="text-xs text-[#6b7a74] mt-1">
                Transferred to HDFC Bank A/C ending in **4092. Ref: IMPS/2026/UBER/{Date.now().toString().slice(-6)}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCashoutModalOpen(false)}
              className="w-full py-2.5 rounded-full bg-[#193c34] text-white font-semibold text-xs hover:bg-[#122c26] transition-colors safar-card-shadow"
            >
              Done &bull; Return to Shift
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
