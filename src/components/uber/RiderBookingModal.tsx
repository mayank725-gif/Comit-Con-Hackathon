"use client";

import React, { useState } from "react";
import { VehicleType, RideRequest } from "@/lib/uber/types";
import { INDIA_TOURIST_PLACES } from "@/lib/uber/touristPlaces";
import {
  X,
  MapPin,
  Navigation,
  Car,
  Zap,
  Sparkles,
  Clock,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Flame,
} from "lucide-react";

interface RiderBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestRide: (request: RideRequest) => void;
  activeSurge: number;
}

const POPULAR_PICKUPS = [
  { name: "M. Chinnaswamy Stadium, MG Road", city: "Bengaluru", coords: [12.9788, 77.5980] as [number, number] },
  { name: "Connaught Place (Inner Circle)", city: "Delhi NCR", coords: [28.6315, 77.2167] as [number, number] },
  { name: "Bandra Kurla Complex (BKC)", city: "Mumbai", coords: [19.0688, 72.8682] as [number, number] },
  { name: "HITEC City Cyber Towers", city: "Hyderabad", coords: [17.4474, 78.3762] as [number, number] },
  { name: "Old Mahabalipuram Road (OMR)", city: "Chennai", coords: [12.9716, 80.2450] as [number, number] },
  { name: "Salt Lake Sector 5", city: "Kolkata", coords: [22.5800, 88.4300] as [number, number] },
];

const VEHICLE_TIERS: {
  type: VehicleType;
  name: string;
  desc: string;
  baseRatePerKm: number;
  iconText: string;
  capacity: string;
  etaMin: number;
}[] = [
  {
    type: "UBER_GO",
    name: "Uber Go",
    desc: "Affordable, compact rides",
    baseRatePerKm: 14,
    iconText: "🚗",
    capacity: "4 seats",
    etaMin: 3,
  },
  {
    type: "UBER_PREMIER",
    name: "Uber Premier",
    desc: "Top rated drivers & sedans",
    baseRatePerKm: 22,
    iconText: "🚘",
    capacity: "4 seats",
    etaMin: 5,
  },
  {
    type: "UBER_AUTO",
    name: "Uber Auto",
    desc: "No haggling, doorstep 3-wheeler",
    baseRatePerKm: 10,
    iconText: "🛺",
    capacity: "3 seats",
    etaMin: 2,
  },
  {
    type: "UBER_GREEN_EV",
    name: "Uber Green EV",
    desc: "100% Electric eco-friendly",
    baseRatePerKm: 16,
    iconText: "⚡",
    capacity: "4 seats",
    etaMin: 4,
  },
];

export default function RiderBookingModal({
  isOpen,
  onClose,
  onRequestRide,
  activeSurge,
}: RiderBookingModalProps) {
  const [pickup, setPickup] = useState(POPULAR_PICKUPS[0]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>("UBER_GO");
  const [dropoffQuery, setDropoffQuery] = useState("");
  const [selectedDropoff, setSelectedDropoff] = useState<{
    name: string;
    city: string;
    coords: [number, number];
    distanceKm: number;
  }>({
    name: "Kempegowda International Airport (BLR)",
    city: "Bengaluru",
    coords: [13.1986, 77.7066],
    distanceKm: 34,
  });

  const [paymentMode, setPaymentMode] = useState<"GOOGLE_PAY_UPI" | "CASH" | "UBER_CASH">("GOOGLE_PAY_UPI");

  if (!isOpen) return null;

  // Filter dropoffs from 32 tourist attractions + airports
  const filteredDestinations = INDIA_TOURIST_PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(dropoffQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(dropoffQuery.toLowerCase()) ||
      p.state.toLowerCase().includes(dropoffQuery.toLowerCase())
  ).slice(0, 5);

  const vehicleConfig = VEHICLE_TIERS.find((v) => v.type === selectedVehicle) || VEHICLE_TIERS[0];
  const surgeMultiplier = Math.max(1.0, activeSurge || 1.4);
  const baseFare = Math.round(selectedDropoff.distanceKm * vehicleConfig.baseRatePerKm + 50);
  const surgeBonus = Math.round(baseFare * (surgeMultiplier - 1.0));
  const finalFare = baseFare + surgeBonus;
  const estimatedMin = Math.round(selectedDropoff.distanceKm * 1.8 + 6);

  const handleConfirmRideRequest = () => {
    const newRide: RideRequest = {
      id: `RIDE_${Date.now().toString().slice(-6)}`,
      riderName: "Priya Sharma",
      riderRating: 4.94,
      pickupAddress: pickup.name,
      pickupCoords: pickup.coords,
      dropoffAddress: `${selectedDropoff.name} (${selectedDropoff.city})`,
      dropoffCoords: selectedDropoff.coords,
      vehicleType: selectedVehicle,
      distanceKm: selectedDropoff.distanceKm,
      durationMin: estimatedMin,
      fareInr: finalFare,
      surgeMultiplier,
      surgeBonusInr: surgeBonus,
      timestamp: new Date().toISOString(),
      status: "REQUESTED",
      paymentMode,
    };

    onRequestRide(newRide);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white text-black font-black flex items-center justify-center text-sm shadow-md">
              Uber
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>Book a Ride</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  Uber 2.0
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Two-sided real-time marketplace dispatch</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pickup & Destination Inputs */}
        <div className="space-y-3">
          {/* Pickup */}
          <div>
            <label className="text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Pickup Location
            </label>
            <select
              value={pickup.name}
              onChange={(e) => {
                const found = POPULAR_PICKUPS.find((p) => p.name === e.target.value);
                if (found) setPickup(found);
              }}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              {POPULAR_PICKUPS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.city})
                </option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="relative">
            <label className="text-xs font-bold text-zinc-300 mb-1 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Destination (City Hotspot or 32 Tourist Attractions)
            </label>
            <input
              type="text"
              value={dropoffQuery}
              onChange={(e) => setDropoffQuery(e.target.value)}
              placeholder="Search destination (e.g. Airport, Taj Mahal, Goa, BKC)..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400 placeholder-zinc-500"
            />

            {/* Destination Dropdown Matches */}
            {dropoffQuery && filteredDestinations.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden z-20 divide-y divide-zinc-800/60 max-h-48 overflow-y-auto">
                {filteredDestinations.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setSelectedDropoff({
                        name: place.name,
                        city: place.city,
                        coords: [place.lat, place.lng],
                        distanceKm: Math.floor(Math.random() * 25) + 12,
                      });
                      setDropoffQuery("");
                    }}
                    className="w-full p-2.5 text-left hover:bg-zinc-800 text-xs text-white flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold block">{place.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {place.city}, {place.state} &bull; {place.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">Select</span>
                  </button>
                ))}
              </div>
            )}

            {/* Currently Selected Destination Banner */}
            <div className="mt-1.5 p-2 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="text-white font-medium truncate">{selectedDropoff.name}</span>
              </div>
              <span className="text-zinc-400 font-mono text-[11px] shrink-0">
                {selectedDropoff.distanceKm} km
              </span>
            </div>
          </div>
        </div>

        {/* Vehicle Tier Selection */}
        <div>
          <label className="text-xs font-bold text-zinc-300 mb-2 block">
            Select Ride Class
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VEHICLE_TIERS.map((tier) => {
              const isSelected = selectedVehicle === tier.type;
              return (
                <button
                  key={tier.type}
                  type="button"
                  onClick={() => setSelectedVehicle(tier.type)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/40 shadow-lg ring-1 ring-cyan-400/50"
                      : "border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700"
                  }`}
                >
                  <span className="text-2xl block mb-1">{tier.iconText}</span>
                  <span className="text-xs font-extrabold text-white block">{tier.name}</span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5 font-mono">
                    {tier.etaMin} min away
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Surge & Fare Calculation Breakdown */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Base Fare ({selectedDropoff.distanceKm} km):</span>
            <span className="font-mono text-zinc-200">₹{baseFare}</span>
          </div>

          {surgeBonus > 0 && (
            <div className="flex items-center justify-between text-amber-400 font-medium">
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                Live Demand Surge ({surgeMultiplier.toFixed(1)}x):
              </span>
              <span className="font-mono">+₹{surgeBonus}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <div>
              <span className="text-xs font-bold text-white block">Guaranteed Ride Fare</span>
              <span className="text-[10px] text-zinc-400 font-mono">Estimated travel: {estimatedMin} mins</span>
            </div>
            <span className="text-2xl font-black text-emerald-400 font-mono">₹{finalFare}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-zinc-400">Payment:</span>
          <div className="flex items-center gap-2">
            {(["GOOGLE_PAY_UPI", "CASH"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPaymentMode(mode)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                  paymentMode === mode
                    ? "bg-white text-black font-extrabold border-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400"
                }`}
              >
                {mode === "GOOGLE_PAY_UPI" ? "📱 Google Pay UPI" : "💵 Cash"}
              </button>
            ))}
          </div>
        </div>

        {/* CTA: Confirm Ride Request */}
        <button
          type="button"
          onClick={handleConfirmRideRequest}
          className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-black font-black text-sm transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-2"
        >
          <span>Request {vehicleConfig.name}</span>
          <span className="text-xs font-mono font-bold text-zinc-700">&bull; ₹{finalFare}</span>
        </button>
      </div>
    </div>
  );
}
