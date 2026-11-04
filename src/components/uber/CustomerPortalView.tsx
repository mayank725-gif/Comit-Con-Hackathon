"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { VehicleType, RideRequest, MarketplaceState, AssistantMessage } from "@/lib/uber/types";
import SurgeHandlingMonitor from "@/components/uber/SurgeHandlingMonitor";
import DriverAssistantChat from "@/components/uber/DriverAssistantChat";
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
  ArrowUpDown,
  Briefcase,
  User,
  Calendar,
  Phone,
  MessageSquare,
  Share2,
  Star,
  FileText,
  Printer,
  ChevronRight,
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
  onBookRide?: (ride: RideRequest) => void;
  onSwitchToDriver?: () => void;
  onTriggerScenario?: (type: any) => Promise<void>;
  riderUser?: any;
  onOpenRiderAuth?: () => void;
  onLogoutRider?: () => void;
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
    desc: "Affordable compact sedans",
    ratePerKm: 13.5,
    icon: "🚗",
    capacity: "4",
    etaMin: 3,
  },
  {
    type: "UBER_PREMIER" as VehicleType,
    name: "Uber Premier",
    desc: "Executive sedans & top drivers",
    ratePerKm: 21.0,
    icon: "🚘",
    capacity: "4",
    etaMin: 5,
  },
  {
    type: "UBER_AUTO" as VehicleType,
    name: "Uber Auto",
    desc: "Doorstep auto rickshaw",
    ratePerKm: 10.0,
    icon: "🛺",
    capacity: "3",
    etaMin: 2,
  },
  {
    type: "UBER_GREEN_EV" as VehicleType,
    name: "Uber Green EV",
    desc: "Zero-emission electric cab",
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
  { name: "DLF Cyber Hub, Gurugram", lat: 28.4950, lng: 77.0895 },
  { name: "HITEC City Cyber Towers", lat: 17.4474, lng: 78.3762 },
];

export default function CustomerPortalView({
  state,
  onBookRide,
  onSwitchToDriver,
  onTriggerScenario,
  riderUser,
  onOpenRiderAuth,
  onLogoutRider,
}: CustomerPortalViewProps) {
  // Navigation Sub-tab inside Customer Portal (Book, Live Surge Balancer, or My Trips)
  const [activeTab, setActiveTab] = useState<"BOOK" | "SURGE_STREAM" | "HISTORY">("BOOK");
  const [rideHistory, setRideHistory] = useState<RideRequest[]>([]);
  const [selectedHistoryRide, setSelectedHistoryRide] = useState<RideRequest | null>(null);

  // Fetch rider trip history from Custom DB
  const fetchRideHistory = async () => {
    try {
      const res = await fetch("/api/uber/rides");
      const data = await res.json();
      if (data.success && data.rides) {
        setRideHistory(data.rides.filter((r: RideRequest) => r.status === "COMPLETED"));
      }
    } catch (e) {
      console.warn("Failed to fetch ride history:", e);
    }
  };

  // Corporate vs Personal Profile Toggle
  const [travelProfile, setTravelProfile] = useState<"PERSONAL" | "BUSINESS">("PERSONAL");
  const [corporateGstin, setCorporateGstin] = useState("29AABCU9603R1ZM");
  const [expenseCode, setExpenseCode] = useState("CORP-SALES-Q4");

  // Ride Scheduling (Now vs Later)
  const [scheduleMode, setScheduleMode] = useState<"NOW" | "LATER">("NOW");
  const [scheduledTime, setScheduledTime] = useState("Today at 10:30 AM");

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
  const [paymentMode, setPaymentMode] = useState<"GOOGLE_PAY_UPI" | "CASH" | "UBER_CASH" | "CORPORATE_CARD">("GOOGLE_PAY_UPI");

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

  // Ride Lifecycle State (Realistic Production Matching)
  const [tripState, setTripState] = useState<"IDLE" | "SEARCHING" | "ASSIGNED" | "ON_TRIP" | "COMPLETED">("IDLE");
  const [assignedDriver, setAssignedDriver] = useState<any | null>(null);
  const [rideOtp, setRideOtp] = useState<string>("5829");
  const [driverEtaMin, setDriverEtaMin] = useState<number>(3);
  const [liveTripSpeed, setLiveTripSpeed] = useState<number>(46);
  const [confirmedRide, setConfirmedRide] = useState<RideRequest | null>(null);

  useEffect(() => {
    fetchRideHistory();
  }, [tripState]);

  // Interactive Caller / Message Dialogs
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [driverMessageText, setDriverMessageText] = useState("");
  const [riderDriverMessages, setRiderDriverMessages] = useState<Array<{ sender: "RIDER" | "DRIVER"; text: string; time: string }>>([
    { sender: "DRIVER", text: "Hello! I am on my way to your pickup location.", time: "Just now" },
  ]);

  // 1,000 Concurrent Ride Stress Test State
  const [isStressTesting, setIsStressTesting] = useState(false);
  const [latestStressData, setLatestStressData] = useState<any>(null);

  // Floating Uber 2.0 AI Assistant State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<AssistantMessage[]>([
    {
      id: "RIDER_AI_INIT",
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: "👋 **नमस्ते! Welcome to Uber 2.0 AI Copilot.**\nI can help you with upfront pricing, vehicle comparisons (Go vs Premier), corporate GST invoicing, or explain live surge shocks. How can I help you?",
      timestamp: new Date().toISOString(),
    },
  ]);

  const handleSendAiMessage = async (query: string) => {
    setIsAiLoading(true);
    const userMsg: AssistantMessage = {
      id: `USER_${Date.now()}`,
      sender: "DRIVER",
      text: query,
      timestamp: new Date().toISOString(),
    };
    setAiChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/uber/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setAiChatMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.error("AI Assistant error:", e);
    } finally {
      setIsAiLoading(false);
    }
  };

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

  // Swap Pickup & Dropoff
  const handleSwapLocations = () => {
    const tempQuery = pickupQuery;
    const tempCoords = pickupCoords;
    setPickupQuery(dropoffQuery);
    setPickupCoords(dropoffCoords);
    setDropoffQuery(tempQuery);
    setDropoffCoords(tempCoords);
  };

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

  // Submit Ride Request (Two-Sided Dispatch & Realistic Lifecycle)
  const handleConfirmBooking = () => {
    // Generate realistic 4-digit ride OTP
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setRideOtp(generatedOtp);

    // Pick real commercial driver from state or DB catalog
    const fleetDriver = state.drivers[0] || {
      name: "Ramesh Kumar",
      rating: 4.93,
      vehicleModel: "Maruti Suzuki Dzire",
      licensePlate: "KA 01 MJ 1042",
      tripsCompleted: 2840,
    };

    const newRide: RideRequest = {
      id: `RIDE_${Date.now().toString().slice(-6)}`,
      riderName: travelProfile === "BUSINESS" ? "Aman Gupta (Corp Travel)" : "Aman Gupta",
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
      paymentMode: travelProfile === "BUSINESS" ? "GOOGLE_PAY_UPI" : paymentMode,
    };

    setConfirmedRide(newRide);
    if (onBookRide) {
      onBookRide(newRide);
    } else {
      fetch("/api/uber/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRide),
      }).catch(console.error);
    }

    // Realistic matching radar animation (Listens in real-time for Driver on Phone 2 to accept)
    setTripState("SEARCHING");
  };

  // Real-Time 2-Phone Synchronization via Custom Database
  useEffect(() => {
    if (!confirmedRide?.id || tripState === "IDLE") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/uber/rides");
        const data = await res.json();
        if (data.success && data.rides) {
          const live = data.rides.find((r: RideRequest) => r.id === confirmedRide.id);
          if (live) {
            if (live.status === "ACCEPTED" && tripState === "SEARCHING") {
              setAssignedDriver({
                name: live.driverName || "Rajesh Kumar (Partner Driver)",
                rating: live.driverRating || 4.96,
                vehicleModel: live.vehicleModel || "Maruti Suzuki Dzire",
                licensePlate: live.licensePlate || "KA 01 MJ 4829",
                tripsCompleted: 2840,
                avatar: live.driverAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                phone: live.driverPhone || "+91 98450 12890",
              });
              if (live.otp) setRideOtp(live.otp);
              setDriverEtaMin(3);
              setTripState("ASSIGNED");
            } else if (live.status === "IN_PROGRESS" && tripState !== "ON_TRIP") {
              setTripState("ON_TRIP");
            } else if (live.status === "COMPLETED" && tripState !== "COMPLETED") {
              setTripState("COMPLETED");
            } else if (live.status === "CANCELLED") {
              setTripState("IDLE");
              setConfirmedRide(null);
            }
          }
        }
      } catch (err) {
        console.warn("Rider cross-device sync poll warning:", err);
      }
    }, 1200);

    return () => clearInterval(pollInterval);
  }, [confirmedRide?.id, tripState]);

  const handleCancelBooking = async () => {
    if (confirmedRide?.id) {
      try {
        await fetch("/api/uber/rides", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rideId: confirmedRide.id,
            status: "CANCELLED",
          }),
        });
      } catch (e) {
        // ignore
      }
    }
    setTripState("IDLE");
    setConfirmedRide(null);
    setAssignedDriver(null);
  };

  const handleSendMessageToDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverMessageText.trim()) return;

    setRiderDriverMessages((prev) => [
      ...prev,
      { sender: "RIDER", text: driverMessageText, time: "Just now" },
    ]);
    const replyText = driverMessageText.toLowerCase().includes("gate")
      ? "Understood! Arriving at the gate in 2 minutes."
      : "Noted sir, will call once I arrive at pickup point.";
    setDriverMessageText("");

    setTimeout(() => {
      setRiderDriverMessages((prev) => [
        ...prev,
        { sender: "DRIVER", text: replyText, time: "Just now" },
      ]);
    }, 1200);
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
        setLatestStressData(data);
        setActiveTab("SURGE_STREAM");
        return data;
      }
    } catch (e) {
      console.error("1000 burst stress test failed:", e);
    } finally {
      setIsStressTesting(false);
    }
  };

  // Calculate GST Tax for Business Travel
  const gstRate = 0.05; // 5% GST for passenger transport
  const basePreTaxFare = Math.round(routeData.finalFareInr / (1 + gstRate));
  const gstAmount = routeData.finalFareInr - basePreTaxFare;
  const cgst = +(gstAmount / 2).toFixed(1);
  const sgst = +(gstAmount / 2).toFixed(1);

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
            <Flame className={`h-3.5 w-3.5 ${activeTab === "SURGE_STREAM" ? "text-black fill-black" : "text-amber-400"}`} />
            <span>⚡ Live Surge Requests</span>
            <span className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold border ${
              activeTab === "SURGE_STREAM"
                ? "bg-black/20 text-black border-black/30"
                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
            }`}>
              {routeData.surgeMultiplier}x Active
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("HISTORY");
              fetchRideHistory();
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-xs transition-all ${
              activeTab === "HISTORY"
                ? "bg-white text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>📁 My Trips</span>
            <span
              className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold border ${
                activeTab === "HISTORY"
                  ? "bg-black/20 text-black border-black/30"
                  : "bg-zinc-800 text-zinc-300 border-zinc-700"
              }`}
            >
              {rideHistory.length}
            </span>
          </button>
        </div>

        {/* Center: Travel Profile Badge (Personal vs Business GST) */}
        <div className="flex items-center rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1 text-xs">
          <button
            type="button"
            onClick={() => setTravelProfile("PERSONAL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              travelProfile === "PERSONAL"
                ? "bg-white text-black shadow-sm font-extrabold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Personal</span>
          </button>

          <button
            type="button"
            onClick={() => setTravelProfile("BUSINESS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
              travelProfile === "BUSINESS"
                ? "bg-white text-black shadow-sm font-extrabold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Business (GST)</span>
          </button>
        </div>

        {/* Right: Logged-in Rider Profile & Switch to Driver */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {riderUser && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/90 text-xs">
              <img
                src={riderUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt={riderUser.name}
                className="w-6 h-6 rounded-full object-cover border border-emerald-400"
              />
              <div className="text-left">
                <span className="font-bold text-white block text-xs leading-none">{riderUser.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">★ {riderUser.rating || 4.95}</span>
              </div>
              {onLogoutRider && (
                <button
                  type="button"
                  onClick={onLogoutRider}
                  className="ml-1 text-[10px] text-zinc-500 hover:text-rose-400 font-bold transition-colors cursor-pointer"
                  title="Sign out of Rider account"
                >
                  Exit
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onSwitchToDriver}
            className="px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>Driver Portal</span>
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
              {/* Header Title & Schedule Toggle */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Request a ride
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Guaranteed upfront pricing &bull; Pan-India real-time dispatch
                  </p>
                </div>

                {/* Schedule Picker */}
                <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setScheduleMode("NOW")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      scheduleMode === "NOW" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Now
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleMode("LATER")}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      scheduleMode === "LATER" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Clock className="h-3 w-3 inline mr-1" />
                    Later
                  </button>
                </div>
              </div>

              {/* Business Travel Billing Callout (When Business Profile is active) */}
              {travelProfile === "BUSINESS" && (
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/90 p-3.5 space-y-2 text-xs animate-fadeIn">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4 text-emerald-400" />
                      <span>Uber for Business &bull; GST Input Tax Credit</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">ITC Eligible</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Company GSTIN</span>
                      <input
                        type="text"
                        value={corporateGstin}
                        onChange={(e) => setCorporateGstin(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-white font-mono uppercase text-xs"
                      />
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Expense Code / Project</span>
                      <input
                        type="text"
                        value={expenseCode}
                        onChange={(e) => setExpenseCode(e.target.value.toUpperCase())}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-white font-mono uppercase text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* The Iconic Uber Route Timeline with Swap Button (Dot -> Connecting Bar -> Square) */}
              <div className="space-y-2 relative">
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
                        placeholder="Pickup location..."
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

                {/* Connecting Line with Swap Button */}
                <div className="flex items-center justify-between pl-[5px] pr-2 py-0.5">
                  <div className="h-4 border-l-2 border-zinc-700" />
                  <button
                    type="button"
                    onClick={handleSwapLocations}
                    title="Swap pickup and destination"
                    className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </div>

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
                        placeholder="Where to? (Destination)..."
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
                  Popular High-Yield Routes:
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
                      <span>{routeData.surgeMultiplier}x Demand Surge Active</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("SURGE_STREAM")}
                      className="text-[10px] font-bold text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <span>View Live Stream</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    Surge shock protection enabled: +₹{routeData.surgeBonusInr} included. Anti-herd damping locks 65% fleet for surrounding city zones.
                  </p>
                </div>
              )}

              {/* VEHICLE TIER LIST (AUTHENTIC PRODUCTION UBER ROWS) */}
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

              {/* FARE BREAKDOWN & GST TAX DETAILS */}
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

                {travelProfile === "BUSINESS" && (
                  <div className="flex items-center justify-between text-zinc-400 text-[11px] border-t border-zinc-800/80 pt-1.5">
                    <span>GST (5% ITC Claimable):</span>
                    <span className="font-mono">CGST: ₹{cgst} + SGST: ₹{sgst} (₹{gstAmount})</span>
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
              {tripState === "IDLE" && (
                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  className="w-full py-4 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-sm transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  <span>Request {VEHICLE_TIERS.find((v) => v.type === selectedVehicle)?.name}</span>
                  <span className="text-xs font-mono font-bold text-zinc-700">&bull; ₹{routeData.finalFareInr}</span>
                </button>
              )}
            </div>

            {/* REALISTIC RIDE LIFECYCLE CARDS (THE MISSING HERO EXPERIENCE) */}
            {/* STATE 1: MATCHING RADAR */}
            {tripState === "SEARCHING" && (
              <div className="rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl space-y-4 animate-fadeIn text-center">
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-zinc-900 border border-emerald-400 flex items-center justify-center text-white">
                    <Car className="h-7 w-7 text-emerald-400 animate-pulse" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-white">Connecting with Nearby Drivers...</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                    Searching commercial fleet near {pickupQuery.split(",")[0]}. Price is locked at <strong>₹{routeData.finalFareInr}</strong>.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Anti-herd damping engaged &bull; Dispersal wave 1</span>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex flex-col items-center gap-2">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    📱 Broadcasting to commercial fleet &bull; Waiting for driver to accept on Driver Portal...
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel Ride Request
                  </button>
                </div>
              </div>
            )}

            {/* STATE 2: DRIVER ASSIGNED & EN ROUTE */}
            {tripState === "ASSIGNED" && assignedDriver && (
              <div className="rounded-3xl border-2 border-emerald-500/60 bg-zinc-950 p-6 shadow-2xl space-y-5 animate-scaleUp">
                {/* Header with OTP & ETA */}
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block font-mono">
                      ● DRIVER EN ROUTE
                    </span>
                    <h3 className="text-xl font-black text-white mt-0.5">
                      Arriving in {driverEtaMin} mins
                    </h3>
                  </div>

                  {/* 4-Digit Security PIN */}
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block font-mono">YOUR SAFETY PIN</span>
                    <div className="px-3 py-1 rounded-xl bg-white text-black font-black text-lg tracking-widest font-mono shadow-md">
                      {rideOtp}
                    </div>
                  </div>
                </div>

                {/* Driver & Vehicle Details Card */}
                <div className="flex items-center justify-between bg-zinc-900/90 rounded-2xl border border-zinc-800 p-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={assignedDriver.avatar}
                      alt={assignedDriver.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-emerald-400 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">{assignedDriver.name}</span>
                        <span className="text-[10px] text-amber-400 font-bold">★ {assignedDriver.rating}</span>
                      </div>
                      <span className="text-xs text-zinc-300 font-medium block">
                        {assignedDriver.vehicleModel}
                      </span>
                      <span className="text-[11px] text-zinc-500 font-mono">
                        {assignedDriver.tripsCompleted} commercial trips completed
                      </span>
                    </div>
                  </div>

                  {/* Indian Yellow Commercial Number Plate */}
                  <div className="rounded-lg bg-amber-400 text-black font-mono font-black text-xs px-2.5 py-1.5 border border-black/40 shadow-inner tracking-wider">
                    {assignedDriver.licensePlate}
                  </div>
                </div>

                {/* Action Controls: Call, Message, Share */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCallModalOpen(true)}
                    className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsChatModalOpen(true)}
                    className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-300" />
                    <span>Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="p-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>

                {/* Safety & Boarding Info */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Provide 4-digit PIN to driver upon car arrival</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    GPS Tracking Active
                  </span>
                </div>
              </div>
            )}

            {/* STATE 3: ON TRIP IN PROGRESS */}
            {tripState === "ON_TRIP" && (
              <div className="rounded-3xl border-2 border-emerald-500 bg-zinc-950 p-6 shadow-2xl space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-extrabold text-xs text-emerald-400 font-mono uppercase">
                      TRIP IN PROGRESS
                    </span>
                  </div>
                  <span className="text-xs font-mono text-zinc-300">{liveTripSpeed} km/h</span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 block font-mono">HEADING TO DROPOFF</span>
                  <h4 className="text-base font-extrabold text-white mt-0.5">{dropoffQuery}</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    ETA: ~{routeData.travelTimeMin} mins &bull; {routeData.distanceKm} km remaining
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-zinc-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>RideCheck Active: Route telemetry monitored 24/7</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Driver completes trip on arrival
                  </span>
                </div>
              </div>
            )}

            {/* STATE 4: TRIP COMPLETED & ENTERPRISE GST TAX INVOICE */}
            {tripState === "COMPLETED" && (
              <div className="rounded-3xl border border-zinc-700 bg-zinc-950 p-6 shadow-2xl space-y-4 animate-scaleUp">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>TRIP COMPLETED &bull; PAID ₹{routeData.finalFareInr}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    SAC: 996412
                  </span>
                </div>

                {/* Printable Business Tax Invoice Summary */}
                <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="font-bold text-white">Official Tax Invoice</span>
                    <span className="font-mono text-zinc-400 text-[10px]">INV-2026-90412</span>
                  </div>

                  <div className="space-y-1 text-zinc-300 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Pickup:</span>
                      <span className="truncate max-w-[200px] text-right">{pickupQuery}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Dropoff:</span>
                      <span className="truncate max-w-[200px] text-right">{dropoffQuery}</span>
                    </div>
                    {travelProfile === "BUSINESS" && (
                      <div className="flex justify-between font-mono text-[10px] text-emerald-400">
                        <span>Corporate GSTIN:</span>
                        <span>{corporateGstin}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-zinc-800 pt-2 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-zinc-400">
                      <span>Base Fare &amp; Distance:</span>
                      <span>₹{routeData.baseFareInr}</span>
                    </div>
                    {routeData.surgeBonusInr > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Dynamic Surge Multiplier ({routeData.surgeMultiplier}x):</span>
                        <span>+₹{routeData.surgeBonusInr}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white font-bold text-xs pt-1 border-t border-zinc-800">
                      <span>Total Paid:</span>
                      <span>₹{routeData.finalFareInr}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Print Invoice / Book Another */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Print Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTripState("IDLE")}
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Book Another Ride</span>
                  </button>
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

      {/* VIEW 2: DEDICATED LIVE SURGE HANDLING REQUESTS MONITOR */}
      {activeTab === "SURGE_STREAM" && (
        <SurgeHandlingMonitor
          state={state}
          onTriggerScenario={onTriggerScenario}
          onTrigger1000Burst={handleTrigger1000BurstTest}
          initialStressData={latestStressData}
        />
      )}

      {/* VIEW 3: DEDICATED RIDER RIDE HISTORY & RECEIPTS */}
      {activeTab === "HISTORY" && (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-7 shadow-2xl space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <span>My Trips &amp; Ride History</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                  {rideHistory.length} Completed
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Past rides, payment receipts, GST tax invoices, and driver ratings.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchRideHistory}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
              <span>Refresh History</span>
            </button>
          </div>

          {rideHistory.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Car className="h-10 w-10 text-zinc-600 mx-auto" />
              <h4 className="text-sm font-bold text-zinc-300">No completed trips yet</h4>
              <p className="text-xs text-zinc-500">Book your first ride on the &apos;Request a Ride&apos; tab to see it logged here!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rideHistory.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:bg-zinc-900 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold">
                        {ride.id}
                      </span>
                      <span className="text-xs font-bold text-white">{ride.timestamp}</span>
                      <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                        {ride.vehicleType ? ride.vehicleType.replace("UBER_", "Uber ") : "Uber Cab"}
                      </span>
                      {ride.surgeMultiplier > 1.0 && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                          ⚡ {ride.surgeMultiplier}x Surge
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                        ✓ Completed
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-zinc-300 pt-1 truncate">
                      <span className="text-zinc-400 truncate">{ride.pickupAddress}</span>
                      <ArrowRight className="h-3 w-3 text-zinc-500 shrink-0" />
                      <span className="text-white font-semibold truncate">{ride.dropoffAddress}</span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-0.5">
                      <span>Driver: <strong className="text-zinc-200">{ride.driverName || "Rajesh Kumar"}</strong></span>
                      <span>&bull;</span>
                      <span>Vehicle: {ride.vehicleModel || "Dzire"} ({ride.licensePlate || "KA 01 MJ 4829"})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <span className="text-base font-black text-white font-mono block">
                        ₹{ride.fareInr}
                      </span>
                      <span className="text-[10px] text-zinc-400 block font-mono">
                        {ride.paymentMode} &bull; Paid
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedHistoryRide(ride)}
                      className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Invoice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILED RIDE INVOICE MODAL */}
      {selectedHistoryRide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h4 className="text-base font-black text-white flex items-center gap-2">
                  <span>Uber Tax Invoice</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
                    PAID
                  </span>
                </h4>
                <span className="text-[10px] text-zinc-400 font-mono">Invoice #{selectedHistoryRide.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryRide(null)}
                className="p-1.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-300">
                <span>Trip Date</span>
                <span className="font-bold text-white">{selectedHistoryRide.timestamp}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Driver Partner</span>
                <span className="font-bold text-white">{selectedHistoryRide.driverName || "Rajesh Kumar"}</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Vehicle</span>
                <span className="font-mono text-zinc-200">{selectedHistoryRide.vehicleModel} ({selectedHistoryRide.licensePlate})</span>
              </div>
              <div className="flex justify-between text-zinc-300">
                <span>Surge Multiplier</span>
                <span className="font-mono text-amber-300 font-bold">{selectedHistoryRide.surgeMultiplier}x</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between text-sm font-black text-white">
                <span>Total Fare Charged</span>
                <span className="font-mono text-emerald-400">₹{selectedHistoryRide.fareInr}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedHistoryRide(null)}
              className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition-all cursor-pointer"
            >
              Close Invoice
            </button>
          </div>
        </div>
      )}

      {/* CALL DRIVER MODAL */}
      {isCallModalOpen && assignedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-zinc-700 bg-zinc-950 p-6 text-center space-y-4 shadow-2xl">
            <img
              src={assignedDriver.avatar}
              alt={assignedDriver.name}
              className="w-20 h-20 rounded-full mx-auto object-cover border-2 border-emerald-400 shadow-xl"
            />
            <div>
              <h4 className="text-lg font-black text-white">{assignedDriver.name}</h4>
              <p className="text-xs text-zinc-400">{assignedDriver.vehicleModel} &bull; {assignedDriver.licensePlate}</p>
              <p className="text-sm font-mono text-emerald-400 font-bold mt-2">Calling: {assignedDriver.phone}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCallModalOpen(false)}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              End Call
            </button>
          </div>
        </div>
      )}

      {/* CHAT WITH DRIVER MODAL */}
      {isChatModalOpen && assignedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-950 p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <img
                  src={assignedDriver.avatar}
                  alt={assignedDriver.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <h4 className="text-xs font-bold text-white">{assignedDriver.name}</h4>
                  <span className="text-[10px] text-zinc-400">Driver Partner</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChatModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto p-1">
              {riderDriverMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.sender === "RIDER" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${
                      m.sender === "RIDER"
                        ? "bg-white text-black font-medium"
                        : "bg-zinc-800 text-white"
                    }`}
                  >
                    <p>{m.text}</p>
                    <span className="text-[9px] opacity-60 block mt-0.5">{m.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessageToDriver} className="flex gap-2 pt-2 border-t border-zinc-800">
              <input
                type="text"
                value={driverMessageText}
                onChange={(e) => setDriverMessageText(e.target.value)}
                placeholder="Message driver (e.g. I am at Gate 1)..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-white text-black font-extrabold text-xs"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
      {/* FLOATING ACTION BUTTON: UBER 2.0 AI COPILOT */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-white hover:bg-zinc-200 text-black font-black text-xs shadow-2xl transition-all border border-zinc-200 ring-4 ring-black/40 group animate-pulse"
        >
          <span className="p-1 rounded-full bg-black text-white text-xs">🤖</span>
          <span>{isAiDrawerOpen ? "Close AI Copilot" : "Ask Uber AI Assistant"}</span>
        </button>
      </div>

      {/* FLOATING AI ASSISTANT DRAWER */}
      {isAiDrawerOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[440px] max-h-[80vh] z-50 rounded-3xl border border-zinc-800 bg-zinc-950/98 shadow-2xl backdrop-blur-2xl overflow-hidden animate-scaleUp flex flex-col">
          <div className="flex items-center justify-between p-3.5 border-b border-zinc-800 bg-zinc-900/90">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold">● Active</span>
              <span className="font-extrabold text-xs text-white">Uber 2.0 Michelangelo AI Assistant</span>
            </div>
            <button
              onClick={() => setIsAiDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-2 overflow-y-auto max-h-[65vh]">
            <DriverAssistantChat
              messages={aiChatMessages}
              onSendMessage={handleSendAiMessage}
              isLoading={isAiLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
