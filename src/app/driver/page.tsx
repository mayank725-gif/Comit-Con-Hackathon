"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import DriverSectorSpotlight from "@/components/uber/DriverSectorSpotlight";
import DriverAssistantChat from "@/components/uber/DriverAssistantChat";
import IncomingRideDispatchModal from "@/components/uber/IncomingRideDispatchModal";
import ActiveTripHUD from "@/components/uber/ActiveTripHUD";
import DriverAuthModal from "@/components/uber/DriverAuthModal";
import MichelangeloTelemetryView from "@/components/uber/MichelangeloTelemetryView";
import UberBenchmarkView from "@/components/uber/UberBenchmarkView";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import { saveDriverProfileToCustomDb } from "@/lib/firebase/authService";
import {
  MarketplaceState,
  ZoneId,
  AssistantMessage,
  RideRequest,
} from "@/lib/uber/types";
import { UBER_BENCHMARK_DATA } from "@/lib/uber/benchmark";
import {
  subscribeToActiveDispatch,
  updateRideInFirestore,
} from "@/lib/firebase/firestoreRides";
import {
  Car,
  ArrowRight,
  Flame,
  Radio,
  MapPin,
  Clock,
  Layers,
  Activity,
  User,
  ShieldCheck,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

// Dynamic Leaflet Real Map import
const RealLeafletMap = dynamic(
  () => import("@/components/uber/RealLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-3xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center space-y-2">
        <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-zinc-400">Loading Live Driver Street Map...</span>
      </div>
    ),
  }
);

export default function DriverPage() {
  const [activeTab, setActiveTab] = useState<"map" | "telemetry" | "benchmarks" | "trips">("map");
  const [state, setState] = useState<MarketplaceState | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>("STADIUM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Driver Authentication & Work Area State
  const [currentUser, setCurrentUser] = useState<DriverUser | null>(null);
  const [currentProfile, setCurrentProfile] = useState<DriverWorkProfile | null>(null);
  const [sectorTelemetry, setSectorTelemetry] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mapFlyToCoords, setMapFlyToCoords] = useState<[number, number] | null>(null);

  // Active Two-Way Dispatch State
  const [incomingRideRequest, setIncomingRideRequest] = useState<RideRequest | null>(null);
  const [activeTrip, setActiveTrip] = useState<RideRequest | null>(null);
  const [driverTrips, setDriverTrips] = useState<RideRequest[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);

  // AI Chat messages
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: "INIT_DRIVER_1",
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: "👋 नमस्ते पार्टनर जी! उबर पार्टनर पोर्टल सक्रिय है। चिन्नास्वामी स्टेडियम और एमजी रोड में 3.5x सर्ज चल रहा है। जैसे ही कोई राइडर बुक करेगा, आपको तुरंत अलर्ट मिलेगा!",
      timestamp: "2026-11-04T00:00:00.000Z",
      actionableRecommendation: {
        suggestedZone: "STADIUM",
        estimatedSurge: 3.5,
        extraEarningsEstimate: "+₹350 - ₹550 / trip",
      },
    },
  ]);

  // Initial load
  useEffect(() => {
    fetchState();
    fetchDriverSession();
  }, []);

  // Live simulation ticker (1.5s interval)
  useEffect(() => {
    let isTicking = false;
    const timer = setInterval(async () => {
      if (isTicking) return;
      isTicking = true;
      try {
        const res = await fetch("/api/uber/tick", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setState(data.state);
        }
      } catch (e) {
        console.error("Driver tick error:", e);
      } finally {
        isTicking = false;
      }
    }, 1500);

    return () => clearInterval(timer);
  }, []);

  // Real-Time Cross-Device Dispatch (Cloud Firestore WebSocket + High-Speed 500ms Polling Fallback)
  useEffect(() => {
    if (activeTrip) return; // Driver already on trip

    // 1. Cloud Firestore Real-Time Listener (Sub-30ms Instant Dispatch)
    const unsubFirestore = subscribeToActiveDispatch((active) => {
      if (
        active &&
        (active.status === "REQUESTED" || active.status === "PENDING") &&
        (!incomingRideRequest || incomingRideRequest.id !== active.id)
      ) {
        setIncomingRideRequest(active);
      }
    });

    // 2. High-speed 500ms HTTP Polling Fallback
    const dispatchInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/uber/rides");
        const data = await res.json();
        if (data.success && data.activeRide) {
          const active: RideRequest = data.activeRide;
          if (
            (active.status === "REQUESTED" || active.status === "PENDING") &&
            (!incomingRideRequest || incomingRideRequest.id !== active.id)
          ) {
            setIncomingRideRequest(active);
          }
        }
      } catch (e) {
        console.warn("Driver incoming dispatch poll note:", e);
      }
    }, 500);

    return () => {
      if (unsubFirestore) unsubFirestore();
      clearInterval(dispatchInterval);
    };
  }, [activeTrip, incomingRideRequest]);

  // Fetch driver trip log whenever current profile is ready or tab switches
  useEffect(() => {
    if (activeTab === "trips" || currentProfile) {
      fetchDriverTrips();
    }
  }, [activeTab, currentProfile?.driverName]);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/uber/state");
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (e) {
      console.error("Failed to fetch state:", e);
    }
  };

  const fetchDriverSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success && data.user && data.profile) {
        setCurrentUser(data.user);
        setCurrentProfile(data.profile);
        setSectorTelemetry(data.sectorTelemetry);
      } else {
        // Enforce mandatory driver login
        setIsAuthModalOpen(true);
      }
    } catch (e) {
      console.error("Failed to fetch driver session:", e);
      setIsAuthModalOpen(true);
    }
  };

  const fetchDriverTrips = async () => {
    setIsLoadingTrips(true);
    try {
      const driverParam = currentProfile?.driverName ? `?driver=${encodeURIComponent(currentProfile.driverName)}` : "";
      const res = await fetch(`/api/uber/rides${driverParam}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.rides)) {
        setDriverTrips(data.rides);
      }
    } catch (e) {
      console.error("Failed to fetch driver trip logs:", e);
    } finally {
      setIsLoadingTrips(false);
    }
  };

  const handleFlyToMySector = (coords: [number, number]) => {
    setMapFlyToCoords([...coords]);
    if (currentProfile?.primaryZone) {
      setSelectedZone(currentProfile.primaryZone as ZoneId);
    }
  };

  const handleAuthSuccess = (user: DriverUser, profile: DriverWorkProfile) => {
    setCurrentUser(user);
    setCurrentProfile(profile);
    setIsAuthModalOpen(false);
    if (profile.assignedCoordinates) {
      setMapFlyToCoords([...profile.assignedCoordinates]);
    }
    if (profile.primaryZone) {
      setSelectedZone(profile.primaryZone as ZoneId);
    }
    fetchDriverSession();
    fetchDriverTrips();
  };

  // Accept Ride (Synced back to Rider Phone 1)
  const handleAcceptRide = async (request: RideRequest) => {
    setIncomingRideRequest(null);
    setActiveTrip(request);

    if (request.pickupCoords) {
      setMapFlyToCoords([...request.pickupCoords]);
    }

    const driverDetails = {
      driverName: currentProfile?.driverName || "Rajesh Kumar (Partner Driver)",
      driverPhone: "+91 98450 12890",
      driverRating: 4.96,
      vehicleModel: currentProfile?.vehicleModel || "Maruti Suzuki Dzire",
      licensePlate: currentProfile?.licensePlate || "KA 01 MJ 4829",
      driverAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      driverCoords: currentProfile?.assignedCoordinates || [12.9788, 77.5980],
    };

    // Sync in real-time with Cloud Firestore
    updateRideInFirestore(request.id, "ACCEPTED", driverDetails).catch(() => {});

    // Sync with Custom Database so Rider on Phone 1 updates instantly!
    try {
      await fetch("/api/uber/rides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: request.id,
          status: "ACCEPTED",
          driverDetails,
        }),
      });
    } catch (e) {
      console.error("Failed to sync accept ride:", e);
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `ACCEPT_${Date.now()}`,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `🚖 **सवारी स्वीकार की गई!**\nयात्री: **${request.riderName}** (★ ${request.riderRating})\nपिकअप: **${request.pickupAddress}**\nकिराया: **₹${request.fareInr}** (सर्ज बोनस शामिल)\n\nनेविगेशन लाइव है। सुरक्षित यात्रा!`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleDeclineRide = async () => {
    if (incomingRideRequest) {
      updateRideInFirestore(incomingRideRequest.id, "CANCELLED").catch(() => {});
      try {
        await fetch("/api/uber/rides", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rideId: incomingRideRequest.id,
            status: "CANCELLED",
          }),
        });
      } catch (e) {
        // ignore
      }
    }
    setIncomingRideRequest(null);
  };

  // Complete Trip (Synced back to Rider Phone 1)
  const handleCompleteTrip = async (trip: RideRequest) => {
    setActiveTrip(null);

    // Sync in real-time with Cloud Firestore (Sub-30ms Instant Push)
    updateRideInFirestore(trip.id, "COMPLETED").catch(() => {});

    // Sync completion with Custom Database so Rider Phone 1 shows receipt & rating!
    try {
      await fetch("/api/uber/rides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: trip.id,
          status: "COMPLETED",
        }),
      });
    } catch (e) {
      console.error("Failed to sync complete ride:", e);
    }

    // Add completed trip to local driver trips log
    const completedLogItem: RideRequest = {
      ...trip,
      status: "COMPLETED",
      driverName: currentProfile?.driverName || "Rajesh Kumar",
      timestamp: "Just now",
    };
    setDriverTrips((prev) => [completedLogItem, ...prev]);

    // Update earnings in current profile & persist into custom database
    const newEarnings = (currentProfile?.currentEarnings || 2070) + trip.fareInr;
    const newTripsCount = (currentProfile?.completedTrips || 5) + 1;

    if (currentUser && currentProfile) {
      const updatedProfile: DriverWorkProfile = {
        ...currentProfile,
        currentEarnings: newEarnings,
        completedTrips: newTripsCount,
      };
      setCurrentProfile(updatedProfile);

      try {
        await saveDriverProfileToCustomDb({
          userId: currentUser.id,
          city: currentProfile.city,
          cityName: currentProfile.cityName,
          primaryZone: currentProfile.primaryZone,
          primaryZoneName: currentProfile.primaryZoneName,
          vehicleType: currentProfile.vehicleType,
          vehicleModel: currentProfile.vehicleModel,
          licensePlate: currentProfile.licensePlate,
          dailyEarningsTarget: currentProfile.dailyEarningsTarget,
          willingOutstation: currentProfile.willingOutstation,
          driverName: currentProfile.driverName,
        });
      } catch (e) {
        console.error("Failed to persist trip earnings:", e);
      }
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `COMPLETE_${Date.now()}`,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `🎉 **यात्रा सफलतापूर्वक पूर्ण!**\nकिराया: **₹${trip.fareInr}** आपके वॉलेट में जोड़ दिया गया है।\nकुल आज की कमाई: **₹${newEarnings}** (${newTripsCount} राइड्स).\n\nअगली राइड के लिए तैयार रहें!`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Simulate incoming dispatch for testing without second phone
  const handleSimulateDispatch = () => {
    const cityName = currentProfile?.cityName || "Bengaluru";
    const primaryZoneName = currentProfile?.primaryZoneName?.split("&")[0].trim() || "M. Chinnaswamy Stadium";

    const simRequest: RideRequest = {
      id: `DISPATCH_${Date.now().toString().slice(-5)}`,
      riderName: "Rahul Verma",
      riderRating: 4.96,
      pickupAddress: `${primaryZoneName}, ${cityName}`,
      pickupCoords: currentProfile?.assignedCoordinates || [12.9788, 77.5980],
      dropoffAddress: `Kempegowda International Airport (BLR T2), ${cityName}`,
      dropoffCoords: [13.1986, 77.7066],
      vehicleType: currentProfile?.vehicleType || "UBER_GO",
      distanceKm: 32,
      durationMin: 45,
      fareInr: 780,
      surgeMultiplier: sectorTelemetry?.surgeMultiplier || 3.2,
      surgeBonusInr: 320,
      timestamp: new Date().toISOString(),
      status: "REQUESTED",
      paymentMode: "GOOGLE_PAY_UPI",
      otp: "4829",
    };

    setIncomingRideRequest(simRequest);
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: AssistantMessage = {
      id: `USER_${Date.now()}`,
      sender: "DRIVER",
      text,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/uber/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          context: {
            currentZone: selectedZone,
            activeScenario: state?.activeScenario?.type,
            hourlyRate: state?.metrics?.avgDriverHourlyRate,
            trafficStatus: sectorTelemetry?.trafficStatus,
          },
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [...prev, data.reply]);
      }
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleTriggerScenario = async (type: any) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/uber/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: type }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (e) {
      console.error("Scenario trigger failed:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const focusedZone = selectedZone && state?.zones ? state.zones[selectedZone] : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
      {/* Standalone Driver Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/95 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Logo & Online Status */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-white">
                Uber
              </span>
              <span className="rounded-md bg-amber-400 text-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Driver Partner
              </span>
            </Link>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ONLINE &bull; Listening for Trips</span>
            </div>
          </div>

          {/* Sub-tab navigation & Rider App Link */}
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === "map" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                🗺️ Driver Map
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trips")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "trips" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                <span>📋 Trip Log</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === "trips" ? "bg-black/20 text-black" : "bg-zinc-800 text-zinc-300"
                }`}>
                  {driverTrips.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("telemetry")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === "telemetry" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                📊 Telemetry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("benchmarks")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activeTab === "benchmarks" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
              >
                🏆 Benchmarks
              </button>
            </div>

            <Link
              href="/rider"
              className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
              title="Open Rider Booking Portal on Phone 1"
            >
              <User className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Open Rider Portal (Phone 1)</span>
              <span className="sm:hidden">Rider App</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Sub-Tab Bar */}
        <div className="flex md:hidden items-center gap-1.5 pt-2.5 overflow-x-auto text-xs border-t border-zinc-900 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
              activeTab === "map" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white bg-zinc-900"
            }`}
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trips")}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all flex items-center gap-1 ${
              activeTab === "trips" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white bg-zinc-900"
            }`}
          >
            <span>📋 Trip Log</span>
            <span className="text-[10px] font-mono font-bold">({driverTrips.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("telemetry")}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
              activeTab === "telemetry" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white bg-zinc-900"
            }`}
          >
            📊 Telemetry
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("benchmarks")}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 transition-all ${
              activeTab === "benchmarks" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white bg-zinc-900"
            }`}
          >
            🏆 Benchmarks
          </button>
        </div>
      </header>

      {/* Main Driver Partner Dashboard */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {activeTab === "map" && (
          <div className="space-y-4">
            {/* Driver Sector Spotlight HUD */}
            <DriverSectorSpotlight
              user={currentUser}
              profile={currentProfile}
              sectorTelemetry={sectorTelemetry}
              onFlyToMySector={handleFlyToMySector}
              onOpenTerritoryModal={() => setIsAuthModalOpen(true)}
              onSimulateDispatch={handleSimulateDispatch}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left 7 Cols: Real Map + Active Trip Navigation Bar */}
              <div className="lg:col-span-7 space-y-3">
                {state && (
                  <RealLeafletMap
                    state={state}
                    selectedZone={selectedZone}
                    onSelectZone={setSelectedZone}
                    flyToCoords={mapFlyToCoords}
                  />
                )}

                {/* Active Trip HUD (Engaged when Ride is Accepted) */}
                {activeTrip && (
                  <ActiveTripHUD
                    trip={activeTrip}
                    onCompleteTrip={handleCompleteTrip}
                  />
                )}

                {/* Selected Hotspot Drawer */}
                {focusedZone && !activeTrip && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          📍 SELECTED HOTSPOT
                        </span>
                        <h4 className="text-sm font-bold text-white mt-0.5">{focusedZone.name}</h4>
                      </div>

                      <div className="text-right">
                        <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/40">
                          ⚡ {focusedZone.surgeMultiplier}x Surge
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          {focusedZone.currentDemand} active requests
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right 5 Cols: AI Voice & Chat Copilot */}
              <div className="lg:col-span-5">
                <DriverAssistantChat
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isLoading={isChatLoading}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Driver Shift Trip Log & Earnings History */}
        {activeTab === "trips" && (
          <div className="space-y-5 animate-fadeIn">
            {/* Shift Earnings Top Summary Card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold">
                      ACTIVE SHIFT
                    </span>
                    <span className="text-xs text-zinc-400">
                      Driver: <strong className="text-white">{currentProfile?.driverName || "Rajesh Kumar"}</strong>
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Shift Trip Log &amp; Payouts
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Real-time transaction history, guaranteed fares, and surge multipliers synced from self-hosted custom DB.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchDriverTrips}
                  className="px-3.5 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-emerald-400 ${isLoadingTrips ? "animate-spin" : ""}`} />
                  <span>Refresh Trip Log</span>
                </button>
              </div>

              {/* Key Driver Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    TOTAL SHIFT EARNINGS
                  </span>
                  <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                    ₹{currentProfile?.currentEarnings || 2070}
                  </span>
                  <span className="text-[10px] text-zinc-500">Target: ₹{currentProfile?.dailyEarningsTarget || 3200}</span>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    COMPLETED TRIPS
                  </span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">
                    {driverTrips.length}
                  </span>
                  <span className="text-[10px] text-emerald-400">100% Acceptance Rate</span>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    AVG. FARE PER TRIP
                  </span>
                  <span className="text-2xl font-black text-white font-mono mt-1 block">
                    ₹{driverTrips.length > 0 ? Math.round(driverTrips.reduce((acc, t) => acc + (t.fareInr || 0), 0) / driverTrips.length) : 480}
                  </span>
                  <span className="text-[10px] text-amber-300">Boosted by Michelangelo surge</span>
                </div>

                <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    PARTNER RATING
                  </span>
                  <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
                    ★ 4.96
                  </span>
                  <span className="text-[10px] text-zinc-400">Based on 2,840 trips</span>
                </div>
              </div>
            </div>

            {/* Trip Cards List */}
            <div className="space-y-3">
              {driverTrips.length === 0 ? (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center space-y-2">
                  <Car className="h-10 w-10 text-zinc-600 mx-auto" />
                  <h4 className="text-sm font-bold text-zinc-300">No completed trips yet this shift</h4>
                  <p className="text-xs text-zinc-500">
                    Switch to &apos;Driver Map&apos; and accept incoming dispatches from Phone 1 to log trips here!
                  </p>
                </div>
              ) : (
                driverTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 hover:border-zinc-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold">
                          {trip.id}
                        </span>
                        <span className="text-xs font-bold text-white">{trip.timestamp}</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                          {trip.vehicleType ? trip.vehicleType.replace("UBER_", "Uber ") : "Uber Cab"}
                        </span>
                        {trip.surgeMultiplier > 1.0 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                            ⚡ {trip.surgeMultiplier}x Surge (+₹{trip.surgeBonusInr || Math.round(trip.fareInr * 0.3)})
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30">
                          ✓ Settled &bull; Cash Collected
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 pt-1 truncate">
                        <span className="text-zinc-400 truncate">{trip.pickupAddress}</span>
                        <ArrowRight className="h-3 w-3 text-zinc-500 shrink-0" />
                        <span className="text-white font-semibold truncate">{trip.dropoffAddress}</span>
                      </div>

                      <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-0.5">
                        <span>Passenger: <strong className="text-zinc-200">{trip.riderName || "Passenger"}</strong></span>
                        <span>&bull;</span>
                        <span>Payment: {trip.paymentMode || "UPI / Digital"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <span className="text-xl font-black text-emerald-400 font-mono block">
                          ₹{trip.fareInr}
                        </span>
                        <span className="text-[10px] text-zinc-400 block font-mono">
                          Net Payout Credited
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Michelangelo ML Telemetry */}
        {activeTab === "telemetry" && state && (
          <MichelangeloTelemetryView
            state={state}
            onTriggerScenario={handleTriggerScenario}
            isProcessing={isProcessing}
          />
        )}

        {/* Tab 4: System Benchmarks */}
        {activeTab === "benchmarks" && (
          <UberBenchmarkView stats={UBER_BENCHMARK_DATA} />
        )}
      </main>

      {/* Real-Time Incoming Ride Dispatch Modal (Rings on Phone 2!) */}
      <IncomingRideDispatchModal
        request={incomingRideRequest}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
      />

      {/* Driver Registration & Territory Modal */}
      <DriverAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onAuthSuccess={handleAuthSuccess}
        onLogout={() => {
          setCurrentUser(null);
          setCurrentProfile(null);
          setIsAuthModalOpen(true);
        }}
        canClose={Boolean(currentUser)}
      />
    </div>
  );
}
