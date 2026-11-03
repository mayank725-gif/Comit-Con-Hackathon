"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { VehicleType, RideRequest, MarketplaceState } from "@/lib/uber/types";
import SurgeHandlingMonitor from "@/components/uber/SurgeHandlingMonitor";
import {
  MapPin,
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
  Search,
} from "lucide-react";

// Dynamic import of Leaflet map for customer view
const RealLeafletMap = dynamic(
  () => import("@/components/uber/RealLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[580px] rounded-3xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center space-y-2">
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
    desc: "Affordable, compact rides",
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

const POPULAR_CHIPS = [
  { name: "M. Chinnaswamy Stadium", lat: 12.9788, lng: 77.5996 },
  { name: "Kempegowda Airport BLR T2", lat: 13.1986, lng: 77.7066 },
  { name: "Indiranagar 100ft Road", lat: 12.9784, lng: 77.6408 },
  { name: "Bandra Kurla Complex (BKC)", lat: 19.0657, lng: 72.8688 },
  { name: "Taj Mahal, Agra", lat: 27.1751, lng: 78.0421 },
  { name: "DLF Cyber Hub, Gurugram", lat: 28.4950, lng: 77.0895 },
];

export default function CustomerPortalView({
  state,
  onBookRide,
  onSwitchToDriver,
}: CustomerPortalViewProps) {
  // Navigation Sub-tab inside Customer Portal
  const [activeTab, setActiveTab] = useState<"BOOK" | "SURGE_STREAM">("BOOK");

  // Pickup & Destination State
  const [pickupQuery, setPickupQuery] = useState("M. Chinnaswamy Stadium, Bengaluru");
  const [pickupCoords, setPickupCoords] = useState<[number, number]>([12.9788, 77.5996]);
  const [dropoffQuery, setDropoffQuery] = useState("Kempegowda International Airport (BLR T2)");
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
  const handleTrigger1000BurstTest = async (overrideLocation?: string) => {
    setIsStressTesting(true);

    try {
      const res = await fetch("/api/uber/stress-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: overrideLocation || pickupQuery,
          lat: pickupCoords[0],
          lng: pickupCoords[1],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStressTestResult(data);
        // Switch directly to the Live Surge Requests Stream so user sees all 1,000 requests stream in!
        setActiveTab("SURGE_STREAM");
        return data;
      }
    } catch (e) {
      console.error("1000 burst stress test failed:", e);
    } finally {
      setIsStressTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Uber-Style Segmented Navigation Bar */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Tab Switcher (Book Ride vs Live Surge Requests) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("BOOK")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${
              activeTab === "BOOK"
                ? "bg-white text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>🚖 Request a Ride</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("SURGE_STREAM")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs transition-all ${
              activeTab === "SURGE_STREAM"
                ? "bg-amber-400 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>⚡ Live Surge Requests</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-extrabold border border-amber-500/30">
              {routeData.surgeMultiplier}x Active
            </span>
          </button>
        </div>

        {/* Center: Custom Database Status Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">Custom Database:</span>
          <span className="text-emerald-400">15 Zones &bull; 24 Drivers Active &bull; Synced</span>
        </div>

        {/* Right: Quick 1,000 Requests Test Button & Driver Portal Switch */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleTrigger1000BurstTest()}
            disabled={isStressTesting}
            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <span>{isStressTesting ? "⚡ Ingesting 1,000 Requests..." : "💥 Ingest 1,000 Requests Shock"}</span>
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

      {/* VIEW 1: UBER RIDER BOOKING VIEW (IDENTICAL TO REAL UBER WEB) */}
      {activeTab === "BOOK" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 5 COLS: Iconic Floating Uber "Request a ride" Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-5">
              {/* Header Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Request a ride
                </h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Guaranteed upfront pricing &bull; Pan-India real-time dispatch
                </p>
              </div>

              {/* The Iconic Uber Route Timeline (Dot -> Connecting Bar -> Square) */}
              <div className="space-y-3 relative">
                {/* Pickup Field */}
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full bg-emerald-400 shrink-0 shadow-sm shadow-emerald-400/50" />
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={pickupQuery}
                        onChange={(e) => handleLocationSearch(e.target.value, "pickup")}
                        onFocus={() => {
                          setActiveSearchField("pickup");
                          setIsSearchingPickup(true);
                        }}
                        placeholder="Pickup location (street, station, airport)..."
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-white rounded-xl px-3.5 py-3 text-xs text-white placeholder-zinc-500 font-medium transition-all focus:outline-none"
                      />
                      {pickupQuery && (
                        <button
                          onClick={() => setPickupQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSearchingPickup && searchResults.length > 0 && activeSearchField === "pickup" && (
                    <div className="absolute top-full left-6 right-0 mt-1 rounded-2xl border border-zinc-800 bg-zinc-900/98 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-56 overflow-y-auto z-40">
                      {searchResults.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectLocation(loc)}
                          className="w-full p-2.5 text-left hover:bg-zinc-800 transition-colors flex items-center justify-between text-xs text-white"
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

                {/* Vertical Line Connector */}
                <div className="ml-[5px] h-3 border-l-2 border-zinc-700" />

                {/* Dropoff Field */}
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-none bg-white shrink-0 shadow-sm" />
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={dropoffQuery}
                        onChange={(e) => handleLocationSearch(e.target.value, "dropoff")}
                        onFocus={() => {
                          setActiveSearchField("dropoff");
                          setIsSearchingDropoff(true);
                        }}
                        placeholder="Where to? (Attraction, locality, office)..."
                        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-white rounded-xl px-3.5 py-3 text-xs text-white placeholder-zinc-500 font-medium transition-all focus:outline-none"
                      />
                      {dropoffQuery && (
                        <button
                          onClick={() => setDropoffQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Autocomplete Dropdown */}
                  {isSearchingDropoff && searchResults.length > 0 && activeSearchField === "dropoff" && (
                    <div className="absolute top-full left-6 right-0 mt-1 rounded-2xl border border-zinc-800 bg-zinc-900/98 backdrop-blur-xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-56 overflow-y-auto z-40">
                      {searchResults.map((loc) => (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => handleSelectLocation(loc)}
                          className="w-full p-2.5 text-left hover:bg-zinc-800 transition-colors flex items-center justify-between text-xs text-white"
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

              {/* Quick Popular Destination Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                  Quick Select Locations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_CHIPS.map((chip) => (
                    <button
                      key={chip.name}
                      type="button"
                      onClick={() => {
                        setDropoffQuery(chip.name);
                        setDropoffCoords([chip.lat, chip.lng]);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-medium transition-all truncate"
                    >
                      {chip.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE SURGE NOTIFICATION CALLOUT BANNER (SURGE HANDLING IN ACTION) */}
              {routeData.surgeMultiplier > 1.0 && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-amber-400 font-extrabold text-xs">
                      <Flame className="h-4 w-4 shrink-0" />
                      <span>{routeData.surgeMultiplier}x Demand Surge Active at Location</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("SURGE_STREAM")}
                      className="text-[10px] font-bold text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <span>View Live Requests</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    Michelangelo dynamic surge engine is balancing demand: +₹{routeData.surgeBonusInr} included in fare. Anti-herd damping locks 65% fleet for other city zones.
                  </p>
                </div>
              )}

              {/* VEHICLE TIER LIST (AUTHENTIC UBER ROWS) */}
              <div className="space-y-2">
                <span className="text-xs font-black text-white block">Suggested Rides</span>
                <div className="space-y-2">
                  {VEHICLE_TIERS.map((tier) => {
                    const isSelected = selectedVehicle === tier.type;
                    const tierFare = Math.round(
                      (routeData.distanceKm * tier.ratePerKm + 50) * routeData.surgeMultiplier
                    );

                    return (
                      <button
                        key={tier.type}
                        type="button"
                        onClick={() => setSelectedVehicle(tier.type)}
                        className={`w-full p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-white bg-zinc-900 shadow-xl ring-2 ring-white/60"
                            : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
                        }`}
                      >
                        {/* Left: Icon & Names */}
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{tier.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-white">{tier.name}</span>
                              <span className="text-[10px] text-zinc-400 flex items-center gap-0.5">
                                👤 {tier.capacity}
                              </span>
                            </div>
                            <span className="text-[11px] text-zinc-400 block">{tier.etaMin} mins away &bull; {tier.desc}</span>
                          </div>
                        </div>

                        {/* Right: Fare */}
                        <div className="text-right">
                          <span className="text-sm font-black text-white font-mono block">
                            ₹{tierFare}
                          </span>
                          {routeData.surgeMultiplier > 1.0 && (
                            <span className="text-[9px] font-mono text-amber-400 font-bold block">
                              ⚡ Surge Inc.
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FARE BREAKDOWN & TRIP ETA */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Trip Route &amp; Travel Time:</span>
                  <span className="font-mono text-zinc-200">
                    {routeData.distanceKm} km &bull; ~{routeData.travelTimeMin} mins
                  </span>
                </div>

                {routeData.surgeBonusInr > 0 && (
                  <div className="flex items-center justify-between text-amber-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Flame className="h-3.5 w-3.5" />
                      Dynamic Surge ({routeData.surgeMultiplier}x):
                    </span>
                    <span className="font-mono">+₹{routeData.surgeBonusInr} included</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div>
                    <span className="font-bold text-white text-xs block">Guaranteed Total Fare</span>
                    <span className="text-[10px] text-emerald-400 font-medium">Fixed rate &bull; No driver negotiation</span>
                  </div>
                  <span className="text-2xl font-black text-white font-mono">₹{routeData.finalFareInr}</span>
                </div>
              </div>

              {/* PAYMENT SELECTOR */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Payment:</span>
                <div className="flex items-center gap-1.5">
                  {(["GOOGLE_PAY_UPI", "CASH", "UBER_CASH"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
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

              {/* FULL-WIDTH UBER REQUEST BUTTON */}
              <button
                type="button"
                onClick={handleConfirmBooking}
                className="w-full py-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2"
              >
                <span>Request {VEHICLE_TIERS.find((v) => v.type === selectedVehicle)?.name}</span>
                <span className="text-xs font-mono font-bold text-zinc-700">&bull; ₹{routeData.finalFareInr}</span>
              </button>
            </div>

            {/* Booking Confirmation Notice */}
            {confirmedRide && (
              <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-4 shadow-xl text-xs space-y-1.5 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>RIDE REQUEST DISPATCHED TO NEARBY DRIVERS!</span>
                </div>
                <p className="text-zinc-300">
                  Driver dispatch notification sent to {confirmedRide.pickupAddress}. Your guaranteed fare is <strong>₹{confirmedRide.fareInr}</strong>.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/90 pt-1 border-t border-emerald-500/20">
                  <span>🗄️ Record Persisted in Custom Database</span>
                  <span>&bull;</span>
                  <span>ID: {confirmedRide.id}</span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 7 COLS: Live Leaflet Map & Fleets */}
          <div className="lg:col-span-7 space-y-4">
            <RealLeafletMap
              state={state}
              selectedZone={null}
              onSelectZone={() => {}}
              flyToCoords={pickupCoords}
            />

            {/* Quick Live Surge Teaser underneath map */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 text-base">⚡</span>
                <div>
                  <span className="font-bold text-white block">Surge Shock Handling Engine Active</span>
                  <span className="text-[10px] text-zinc-400">
                    Live surge requests at {pickupQuery.split(",")[0]}: {routeData.surgeMultiplier}x Multiplier
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("SURGE_STREAM")}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 text-xs font-bold transition-all flex items-center gap-1"
              >
                <span>View All Surge Requests</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DEDICATED LIVE SURGE HANDLING REQUESTS MONITOR (THE MISSING HERO SCREEN) */}
      {activeTab === "SURGE_STREAM" && (
        <SurgeHandlingMonitor
          state={state}
          onTrigger1000Burst={handleTrigger1000BurstTest}
        />
      )}
    </div>
  );
}
