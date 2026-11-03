"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { VehicleType, RideRequest, MarketplaceState } from "@/lib/uber/types";
import {
  MapPin,
  Search,
  Navigation,
  Car,
  Clock,
  Zap,
  Flame,
  CheckCircle2,
  X,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

// Dynamic import of Leaflet map for customer view
const RealLeafletMap = dynamic(
  () => import("@/components/uber/RealLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[540px] rounded-3xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center space-y-2">
        <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-zinc-400">Loading Live Street Map...</span>
      </div>
    ),
  }
);

interface CustomerPortalViewProps {
  state: MarketplaceState;
  onBookRide: (ride: RideRequest) => void;
  onSwitchToDriver: () => void;
}

interface LocationItem {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  category: string;
}

const VEHICLE_TIERS = [
  {
    type: "UBER_GO" as VehicleType,
    name: "Uber Go",
    desc: "Everyday affordable rides",
    ratePerKm: 13.5,
    icon: "🚗",
    capacity: "4",
    etaMin: 3,
  },
  {
    type: "UBER_PREMIER" as VehicleType,
    name: "Uber Premier",
    desc: "Top sedans & legroom",
    ratePerKm: 21.0,
    icon: "🚘",
    capacity: "4",
    etaMin: 5,
  },
  {
    type: "UBER_AUTO" as VehicleType,
    name: "Uber Auto",
    desc: "Quick 3-wheeler doorstep",
    ratePerKm: 10.0,
    icon: "🛺",
    capacity: "3",
    etaMin: 2,
  },
  {
    type: "UBER_GREEN_EV" as VehicleType,
    name: "Uber Green EV",
    desc: "Zero-emission electric",
    ratePerKm: 15.0,
    icon: "⚡",
    capacity: "4",
    etaMin: 4,
  },
];

export default function CustomerPortalView({
  state,
  onBookRide,
  onSwitchToDriver,
}: CustomerPortalViewProps) {
  // Pickup & Destination State
  const [pickupQuery, setPickupQuery] = useState("M. Chinnaswamy Stadium, Bengaluru");
  const [pickupCoords, setPickupCoords] = useState<[number, number]>([12.9788, 77.5996]);
  const [dropoffQuery, setDropoffQuery] = useState("Kempegowda International Airport (BLR)");
  const [dropoffCoords, setDropoffCoords] = useState<[number, number]>([13.1986, 77.7066]);

  // Autocomplete search results
  const [isSearchingPickup, setIsSearchingPickup] = useState(false);
  const [isSearchingDropoff, setIsSearchingDropoff] = useState(false);
  const [searchResults, setSearchResults] = useState<LocationItem[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<"pickup" | "dropoff" | null>(null);

  // Selected vehicle & payment
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>("UBER_GO");
  const [paymentMode, setPaymentMode] = useState<"GOOGLE_PAY_UPI" | "CASH" | "UBER_CASH">("GOOGLE_PAY_UPI");

  // Dynamic Routing Result from Backend
  const [routeData, setRouteData] = useState<{
    distanceKm: number;
    travelTimeMin: number;
    pickupEtaMin: number;
    baseFareInr: number;
    surgeBonusInr: number;
    finalFareInr: number;
    surgeMultiplier: number;
  }>({
    distanceKm: 34.2,
    travelTimeMin: 48,
    pickupEtaMin: 3,
    baseFareInr: 510,
    surgeBonusInr: 204,
    finalFareInr: 714,
    surgeMultiplier: 1.4,
  });

  // Booking confirmed banner
  const [confirmedRide, setConfirmedRide] = useState<RideRequest | null>(null);

  // 1,000 Concurrent Ride Stress Test State
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [stressTestResult, setStressTestResult] = useState<any | null>(null);
  const [isStressModalOpen, setIsStressModalOpen] = useState(false);

  // Query Backend Smart Routing whenever pickup, dropoff, or vehicle changes
  useEffect(() => {
    let isCancelled = false;

    const fetchSmartRoute = async () => {
      try {
        const res = await fetch("/api/uber/smart-route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupCoords,
            dropoffCoords,
            pickupName: pickupQuery,
            dropoffName: dropoffQuery,
            vehicleType: selectedVehicle,
            currentSurgeMultiplier: state.metrics.cityAvgSurge || 1.4,
          }),
        });

        const data = await res.json();
        if (data.success && data.smartRouting && !isCancelled) {
          setRouteData(data.smartRouting);
        }
      } catch (e) {
        console.error("Smart routing error:", e);
      }
    };

    fetchSmartRoute();
    return () => {
      isCancelled = true;
    };
  }, [pickupCoords, dropoffCoords, selectedVehicle, state.metrics.cityAvgSurge]);

  // Live Location Search (OpenStreetMap Nominatim + India Database)
  const handleLocationSearch = async (text: string, field: "pickup" | "dropoff") => {
    setActiveSearchField(field);
    if (field === "pickup") {
      setPickupQuery(text);
      setIsSearchingPickup(true);
    } else {
      setDropoffQuery(text);
      setIsSearchingDropoff(true);
    }

    if (text.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/uber/locations?q=${encodeURIComponent(text.trim())}`);
      const data = await res.json();
      if (data.success && data.locations) {
        setSearchResults(data.locations);
      }
    } catch (e) {
      console.error("Location search failed:", e);
    }
  };

  const handleSelectLocation = (loc: LocationItem) => {
    if (activeSearchField === "pickup") {
      setPickupQuery(loc.name);
      setPickupCoords([loc.lat, loc.lng]);
      setIsSearchingPickup(false);
    } else if (activeSearchField === "dropoff") {
      setDropoffQuery(loc.name);
      setDropoffCoords([loc.lat, loc.lng]);
      setIsSearchingDropoff(false);
    }
    setActiveSearchField(null);
    setSearchResults([]);
  };

  // Submit Ride Request (Two-Sided Dispatch)
  const handleConfirmBooking = () => {
    const newRide: RideRequest = {
      id: `RIDE_${Date.now().toString().slice(-6)}`,
      riderName: "Aman Gupta",
      riderRating: 4.95,
      pickupAddress: pickupQuery,
      pickupCoords,
      dropoffAddress: dropoffQuery,
      dropoffCoords,
      vehicleType: selectedVehicle,
      distanceKm: routeData.distanceKm,
      durationMin: routeData.travelTimeMin,
      fareInr: routeData.finalFareInr,
      surgeMultiplier: routeData.surgeMultiplier,
      surgeBonusInr: routeData.surgeBonusInr,
      timestamp: new Date().toISOString(),
      status: "REQUESTED",
      paymentMode,
    };

    setConfirmedRide(newRide);
    onBookRide(newRide);
  };

  // 1,000 Concurrent Ride Request Shock Stress Test
  const handleTrigger1000BurstTest = async () => {
    setIsStressTesting(true);
    setIsStressModalOpen(true);

    try {
      const res = await fetch("/api/uber/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: pickupQuery,
          lat: pickupCoords[0],
          lng: pickupCoords[1],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStressTestResult(data);
      }
    } catch (e) {
      console.error("1000 burst stress test failed:", e);
    } finally {
      setIsStressTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Headline Banner */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-[#0e0e0e] to-zinc-950 p-5 sm:p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-zinc-300">
              UBER 2.0 CUSTOMER RIDE PORTAL
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold">
              Pan-India Live Booking
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
            Where to? Book an Instant Ride Anywhere in India
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Real-time backend dispatch across all Indian cities, airports, metro stations, and 32 tourist destinations with zero surge extortion.
          </p>
        </div>

        {/* 1,000 Stress Test CTA & Switch to Driver Portal */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleTrigger1000BurstTest}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5"
          >
            <span>💥 Flash Test: 1,000 Requests</span>
          </button>

          <button
            type="button"
            onClick={onSwitchToDriver}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Switch to Driver</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Grid: Left Ride Booking Form, Right Map & Fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Clean Passenger Booking Card (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-5 sm:p-6 shadow-2xl space-y-4 backdrop-blur-md">
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>Ride Options</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Live Surge: {routeData.surgeMultiplier}x
              </span>
            </h2>

            {/* Pickup & Destination Inputs with Live India-Wide Search */}
            <div className="space-y-3 relative">
              {/* Pickup Input */}
              <div className="relative">
                <label className="text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  Pickup Point (Search Any Location in India)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={pickupQuery}
                    onChange={(e) => handleLocationSearch(e.target.value, "pickup")}
                    onFocus={() => {
                      setActiveSearchField("pickup");
                      setIsSearchingPickup(true);
                    }}
                    placeholder="Enter pickup address, street, or station..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder-zinc-500"
                  />
                  {pickupQuery && (
                    <button
                      onClick={() => setPickupQuery("")}
                      className="absolute right-2.5 text-zinc-400 hover:text-white p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchingPickup && searchResults.length > 0 && activeSearchField === "pickup" && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl border border-zinc-800 bg-zinc-900/98 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-56 overflow-y-auto z-40">
                    {searchResults.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full p-2.5 text-left hover:bg-zinc-800/90 transition-colors flex items-center justify-between text-xs text-white"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold block truncate">{loc.name}</span>
                          <span className="text-[10px] text-zinc-400 block truncate">{loc.address}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">{loc.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination Input */}
              <div className="relative">
                <label className="text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Dropoff Destination (Search Any Location in India)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={dropoffQuery}
                    onChange={(e) => handleLocationSearch(e.target.value, "dropoff")}
                    onFocus={() => {
                      setActiveSearchField("dropoff");
                      setIsSearchingDropoff(true);
                    }}
                    placeholder="Enter destination, monument, or airport..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition-colors placeholder-zinc-500"
                  />
                  {dropoffQuery && (
                    <button
                      onClick={() => setDropoffQuery("")}
                      className="absolute right-2.5 text-zinc-400 hover:text-white p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isSearchingDropoff && searchResults.length > 0 && activeSearchField === "dropoff" && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl border border-zinc-800 bg-zinc-900/98 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-56 overflow-y-auto z-40">
                    {searchResults.map((loc) => (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectLocation(loc)}
                        className="w-full p-2.5 text-left hover:bg-zinc-800/90 transition-colors flex items-center justify-between text-xs text-white"
                      >
                        <div className="truncate pr-2">
                          <span className="font-bold block truncate">{loc.name}</span>
                          <span className="text-[10px] text-zinc-400 block truncate">{loc.address}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">{loc.city}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle Tier Cards */}
            <div>
              <span className="text-xs font-bold text-zinc-300 block mb-2">Select Vehicle Class</span>
              <div className="grid grid-cols-2 gap-2">
                {VEHICLE_TIERS.map((tier) => {
                  const isSelected = selectedVehicle === tier.type;
                  // Dynamic fare calculation for each tier
                  const tierFare = Math.round(
                    (routeData.distanceKm * tier.ratePerKm + 50) * routeData.surgeMultiplier
                  );

                  return (
                    <button
                      key={tier.type}
                      type="button"
                      onClick={() => setSelectedVehicle(tier.type)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "border-white bg-zinc-900 shadow-xl ring-1 ring-white/50"
                          : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{tier.icon}</span>
                        <span className="text-xs font-mono font-black text-white">₹{tierFare}</span>
                      </div>
                      <span className="text-xs font-extrabold text-white block mt-1">{tier.name}</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">{tier.etaMin} min &bull; {tier.capacity} seats</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Trip Details Summary (Clean, Calculated on Backend) */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Trip Distance &amp; ETA:</span>
                <span className="font-mono text-zinc-200">
                  {routeData.distanceKm} km &bull; ~{routeData.travelTimeMin} mins
                </span>
              </div>

              {routeData.surgeBonusInr > 0 && (
                <div className="flex items-center justify-between text-amber-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3.5 w-3.5" />
                    Demand Surge ({routeData.surgeMultiplier.toFixed(1)}x):
                  </span>
                  <span className="font-mono">+₹{routeData.surgeBonusInr} included</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <div>
                  <span className="font-bold text-white text-xs block">Guaranteed Ride Fare</span>
                  <span className="text-[10px] text-emerald-400">Fixed rate &bull; No driver negotiation</span>
                </div>
                <span className="text-2xl font-black text-white font-mono">₹{routeData.finalFareInr}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800">
              <span className="text-zinc-400">Payment:</span>
              <div className="flex items-center gap-1.5">
                {(["GOOGLE_PAY_UPI", "CASH", "UBER_CASH"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPaymentMode(mode)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                      paymentMode === mode
                        ? "bg-white text-black border-white"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {mode === "GOOGLE_PAY_UPI" ? "📱 UPI" : mode === "CASH" ? "💵 Cash" : "💳 Uber Cash"}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Ride Button */}
            <button
              type="button"
              onClick={handleConfirmBooking}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <span>Request {VEHICLE_TIERS.find((v) => v.type === selectedVehicle)?.name}</span>
              <span className="text-xs font-mono font-bold text-zinc-700">&bull; ₹{routeData.finalFareInr}</span>
            </button>
          </div>

          {/* Booking Confirmation Pill */}
          {confirmedRide && (
            <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-4 shadow-xl text-xs space-y-1.5 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>RIDE REQUEST DISPATCHED TO NEARBY DRIVERS!</span>
              </div>
              <p className="text-zinc-300">
                Driver dispatch notification sent to {confirmedRide.pickupAddress}. Your guaranteed fare is <strong>₹{confirmedRide.fareInr}</strong>.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Clean Map with Moving Fleets (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <RealLeafletMap
            state={state}
            selectedZone={null}
            onSelectZone={() => {}}
            flyToCoords={pickupCoords}
          />
        </div>
      </div>

      {/* =========================================================================
          1,000 CONCURRENT RIDE REQUEST STRESS TEST MODAL
          Demonstrating How the Backend Tackles Massive Localized Shocks
         ========================================================================= */}
      {isStressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/50 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 text-lg">💥</span>
                <div>
                  <h3 className="text-base font-black text-white">
                    1,000 Simultaneous Ride Requests Stress Test
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Live simulation of extreme flash shocks at {pickupQuery}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsStressModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Loading Spinner during computation */}
            {isStressTesting ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="h-8 w-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <span className="text-xs font-mono text-zinc-300">
                  Ingesting 1,000 Concurrent Requests via Michelangelo Kafka Pipeline...
                </span>
              </div>
            ) : stressTestResult ? (
              <div className="space-y-4">
                {/* 4 Summary Metric Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block font-medium">Requests Ingested</span>
                    <span className="text-xl font-black text-white font-mono">1,000</span>
                    <span className="text-[10px] text-emerald-400 block font-bold">100% Ingested</span>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block font-medium">Surge Stabilized</span>
                    <span className="text-xl font-black text-amber-400 font-mono">
                      {stressTestResult.surgeMultiplier}x
                    </span>
                    <span className="text-[10px] text-amber-300 block font-bold">Anti-Gouging Cap</span>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block font-medium">Wave 1 Instant Dispatches</span>
                    <span className="text-xl font-black text-white font-mono">
                      {stressTestResult.instantWave1Dispatched} cabs
                    </span>
                    <span className="text-[10px] text-zinc-400 block">Nearby vehicles</span>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 space-y-0.5">
                    <span className="text-[10px] text-zinc-400 block font-medium">Backend Ingestion Latency</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {stressTestResult.processingLatencyMs}ms
                    </span>
                    <span className="text-[10px] text-emerald-300 block font-bold">Zero Crash</span>
                  </div>
                </div>

                {/* Strategy Explanation: How Our App Tackles It */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>How the Michelangelo Engine Solves 1,000 Sudden Requests:</span>
                  </div>
                  <ul className="space-y-1.5 text-zinc-300 pl-1">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">1.</span>
                      <span>{stressTestResult.aiTackleExplanation.point1}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">2.</span>
                      <span>{stressTestResult.aiTackleExplanation.point2}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">3.</span>
                      <span>{stressTestResult.aiTackleExplanation.point3}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">4.</span>
                      <span>{stressTestResult.aiTackleExplanation.point4}</span>
                    </li>
                  </ul>
                </div>

                {/* Staggered Departure Waves Queue */}
                <div className="space-y-2 text-xs">
                  <span className="font-bold text-white block">Staggered Arrival Waves (Preventing Single-Street Deadlock):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {stressTestResult.staggeredWaves.map((w: any) => (
                      <div
                        key={w.waveNumber}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-bold text-white block">Wave {w.waveNumber} &bull; {w.pickupTime}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{w.cabsDispatched} vehicles assigned</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multi-Arterial Dispersal Gates */}
                <div className="space-y-2 text-xs pt-1">
                  <span className="font-bold text-white block">Pedestrian Dispersal Gates (Crowd Dispersion):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {stressTestResult.dispersalGates.map((gate: any) => (
                      <div
                        key={gate.name}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-2.5 space-y-0.5"
                      >
                        <span className="font-bold text-white block text-[11px] truncate">{gate.name}</span>
                        <span className="text-emerald-400 font-bold block">{gate.ridersAllocated} riders</span>
                        <span className="text-[10px] text-zinc-400 block font-mono">Walk {gate.avgWalkMeters}m &bull; ETA {gate.waitTimeMin}m</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Footer */}
            <div className="pt-2 border-t border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStressModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition-all"
              >
                Close Simulation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
