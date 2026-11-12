"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import DriverSectorSpotlight from "@/components/uber/DriverSectorSpotlight";
import DriverAssistantChat from "@/components/uber/DriverAssistantChat";
import IncomingRideDispatchModal from "@/components/uber/IncomingRideDispatchModal";
import ActiveTripHUD from "@/components/uber/ActiveTripHUD";
import DriverAuthModal from "@/components/uber/DriverAuthModal";
import MichelangeloTelemetryView from "@/components/uber/MichelangeloTelemetryView";
import UberBenchmarkView from "@/components/uber/UberBenchmarkView";
import PredictiveRepositioningHUD from "@/components/uber/PredictiveRepositioningHUD";
import EVChargingStationHUD from "@/components/uber/EVChargingStationHUD";
import CorporateInvoiceModal from "@/components/uber/CorporateInvoiceModal";
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
  broadcastRideStatus,
  listenToIncomingDispatches,
} from "@/lib/uber/liveSync";
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
  Zap,
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
  const [activeTab, setActiveTab] = useState<"map" | "telemetry" | "benchmarks" | "trips" | "radar" | "ev">("map");
  const [selectedInvoiceTrip, setSelectedInvoiceTrip] = useState<RideRequest | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
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

  // References to prevent duplicate dispatches, ghost re-alerts on decline, or alerts while on trip
  const declinedRideIdsRef = useRef<Set<string>>(new Set());
  const activeTripRef = useRef<RideRequest | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const isOnDutyRef = useRef<boolean>(true);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    isOnDutyRef.current = isOnDuty;
  }, [isOnDuty]);

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

  // Real-Time Cross-Device Dispatch (LiveSync SSE + Cloud Firestore + 1500ms Fallback Polling)
  useEffect(() => {
    const handleIncomingDispatch = (active: RideRequest | null) => {
      // Rule 0: DO NOT show dispatch if driver is OFFLINE
      if (!isOnDutyRef.current) return;
      // Rule 1: DO NOT send or show new dispatch if driver is currently on an active trip!
      if (activeTripRef.current) return;
      // Rule 2: DO NOT show a ride that was declined by this driver!
      if (!active || !active.id || declinedRideIdsRef.current.has(active.id)) return;
      // Rule 3: Only PENDING or REQUESTED rides
      if (active.status !== "REQUESTED" && active.status !== "PENDING") return;

      setIncomingRideRequest((prev) => {
        if (prev && prev.id === active.id) return prev;
        return active;
      });
    };

    // 1. Ultra-Low-Latency SSE Stream (Sub-50ms instant dispatch push)
    const unsubLiveSync = listenToIncomingDispatches((active) => {
      handleIncomingDispatch(active);
    });

    // 2. Cloud Firestore Real-Time Listener (Sub-30ms Instant Dispatch)
    const unsubFirestore = subscribeToActiveDispatch((active) => {
      handleIncomingDispatch(active);
    });

    // 3. Fallback Polling (1500ms instead of aggressive 300ms)
    const dispatchInterval = setInterval(async () => {
      if (activeTripRef.current || !isOnDutyRef.current) return; // Driver on trip or offline, don't poll
      try {
        const res = await fetch("/api/uber/rides");
        const data = await res.json();
        if (data.success && data.activeRide) {
          handleIncomingDispatch(data.activeRide);
        }
      } catch (e) {
        // quiet warning
      }
    }, 1500);

    return () => {
      unsubLiveSync();
      if (unsubFirestore) unsubFirestore();
      clearInterval(dispatchInterval);
    };
  }, []);

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
    activeTripRef.current = request;

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

    // 1. Ultra-Low-Latency SSE/WebSocket broadcast (Sub-50ms)
    broadcastRideStatus(request.id, "ACCEPTED", driverDetails).catch(() => {});

    // 2. Sync in real-time with Cloud Firestore
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
    if (!incomingRideRequest) return;
    const decliningId = incomingRideRequest.id;

    // 1. Permanently ignore this ride ID in memory so it never rings again
    declinedRideIdsRef.current.add(decliningId);
    setIncomingRideRequest(null);

    // 2. Broadcast cancellation
    broadcastRideStatus(decliningId, "CANCELLED").catch(() => {});
    updateRideInFirestore(decliningId, "CANCELLED").catch(() => {});
    try {
      await fetch("/api/uber/rides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: decliningId,
          status: "CANCELLED",
        }),
      });
    } catch (e) {
      // ignore
    }
  };

  // Complete Trip (Synced back to Rider Phone 1)
  const handleCompleteTrip = async (trip: RideRequest) => {
    setActiveTrip(null);
    activeTripRef.current = null;

    // 1. Ultra-Low-Latency SSE/WebSocket broadcast (Sub-50ms instant trigger to Rider)
    broadcastRideStatus(trip.id, "COMPLETED").catch(() => {});

    // 2. Sync in real-time with Cloud Firestore (Sub-30ms Instant Push)
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
          currentEarnings: newEarnings,
          completedTrips: newTripsCount,
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
      const userKey = typeof window !== "undefined" ? localStorage.getItem("uber_gemini_key") || "" : "";
      const res = await fetch("/api/uber/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          message: text,
          driverProfile: currentProfile,
          history: chatMessages.slice(-6),
          apiKey: userKey,
          context: {
            currentZone: selectedZone,
            activeScenario: state?.activeScenario?.type,
            hourlyRate: state?.metrics?.avgDriverHourlyRate,
            trafficStatus: sectorTelemetry?.trafficStatus,
          },
        }),
      });
      const data = await res.json();
      const msg = data.message || data.reply;
      if (msg) {
        setChatMessages((prev) => [...prev, msg]);
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
    <div className="min-h-screen bg-[#fafaf6] text-[#193c34] flex flex-col font-sans selection:bg-[#ecf1e8]">
      {/* Standalone Driver Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e2e6de] bg-white/85 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Logo & Online Status */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#193c34] group-hover:text-[#f87746] transition-colors">
                Uber
              </span>
              <span className="rounded-full bg-[#ecf1e8] text-[#193c34] px-2.5 py-0.5 text-[11px] font-bold tracking-wide">
                Driver Partner
              </span>
            </Link>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecf1e8] border border-[#d2dcd5] text-[11px] text-[#193c34] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#193c34] animate-ping" />
              <span>ONLINE &bull; Ready for Trips</span>
            </div>
          </div>

          {/* Sub-tab navigation & Rider App Link */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1 p-1 rounded-full bg-[#f4f5f0] border border-[#e2e6de] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("map")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "map" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>Driver Map</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("trips")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "trips" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Trip Log</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "trips" ? "bg-[#ecf1e8] text-[#193c34]" : "bg-white text-[#6b7a74]"
                }`}>
                  {driverTrips.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("telemetry")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "telemetry" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
                }`}
              >
                <Activity className="h-3.5 w-3.5" />
                <span>City Status</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("benchmarks")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === "benchmarks" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Earnings Growth</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("radar")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1 ${
                  activeTab === "radar" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
                }`}
              >
                <Radio className="h-3.5 w-3.5 text-[#f87746]" />
                <span>Predictive Radar</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ev")}
                className={`px-3.5 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1 ${
                  activeTab === "ev" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
                }`}
              >
                <Zap className="h-3.5 w-3.5 text-[#193c34]" />
                <span>EV Hub</span>
              </button>
            </div>

            <Link
              href="/rider"
              className="px-4 py-1.5 rounded-full border border-[#e2e6de] bg-white hover:bg-[#ecf1e8] text-[#193c34] font-semibold text-xs transition-all flex items-center gap-2 shrink-0 safar-card-shadow"
              title="Open Rider Booking Portal on Phone 1"
            >
              <User className="h-3.5 w-3.5 text-[#f87746]" />
              <span className="hidden sm:inline">Rider Portal</span>
              <span className="sm:hidden">Rider</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#6b7a74]" />
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Sub-Tab Bar */}
        <div className="flex md:hidden items-center gap-1.5 pt-2.5 overflow-x-auto text-xs border-t border-[#e2e6de] mt-2">
          <button
            type="button"
            onClick={() => setActiveTab("map")}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all ${
              activeTab === "map" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
            }`}
          >
            🗺️ Map
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("trips")}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeTab === "trips" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
            }`}
          >
            <span>📋 Trip Log</span>
            <span className="text-[10px] font-bold">({driverTrips.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("telemetry")}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all ${
              activeTab === "telemetry" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
            }`}
          >
            📊 City Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("benchmarks")}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all ${
              activeTab === "benchmarks" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
            }`}
          >
            🏆 Growth
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeTab === "radar" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
            }`}
          >
            <Radio className="h-3 w-3 text-[#f87746]" />
            <span>Radar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ev")}
            className={`px-3 py-1.5 rounded-full font-semibold shrink-0 transition-all flex items-center gap-1 ${
              activeTab === "ev" ? "bg-white text-[#193c34] safar-card-shadow" : "text-[#6b7a74] hover:text-[#193c34]"
            }`}
          >
            <Zap className="h-3 w-3 text-[#193c34]" />
            <span>EV Hub</span>
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
              isOnDuty={isOnDuty}
              onToggleDuty={() => {
                setIsOnDuty((prev) => {
                  const nextVal = !prev;
                  isOnDutyRef.current = nextVal;
                  if (!nextVal) setIncomingRideRequest(null);
                  return nextVal;
                });
              }}
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
          <div className="space-y-5 animate-fadeIn text-[#193c34]">
            {/* Shift Earnings Top Summary Card */}
            <div className="rounded-[28px] border border-[#e2e6de] bg-white p-6 safar-card-shadow">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#e2e6de] pb-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#ecf1e8] text-[#193c34] font-semibold">
                      ACTIVE SHIFT
                    </span>
                    <span className="text-xs text-[#6b7a74]">
                      Driver Partner: <strong className="text-[#193c34]">{currentProfile?.driverName || "Rajesh Kumar"}</strong>
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#193c34] tracking-tight">
                    Shift Trip Log &amp; Payouts
                  </h2>
                  <p className="text-xs text-[#6b7a74]">
                    Real-time transaction history, upfront verified fares, and live surge payouts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchDriverTrips}
                  className="px-4 py-2 rounded-full border border-[#e2e6de] bg-white hover:bg-[#ecf1e8] text-[#193c34] text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer safar-card-shadow"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#193c34] ${isLoadingTrips ? "animate-spin" : ""}`} />
                  <span>Refresh Log</span>
                </button>
              </div>

              {/* Key Driver Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                <div className="p-4 rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9]">
                  <span className="text-[10px] font-semibold text-[#6b7a74] uppercase tracking-wider block">
                    TOTAL SHIFT EARNINGS
                  </span>
                  <span className="text-2xl font-bold text-[#193c34] font-mono mt-1 block">
                    ₹{currentProfile?.currentEarnings || 2070}
                  </span>
                  <span className="text-[10px] text-[#6b7a74]">Target: ₹{currentProfile?.dailyEarningsTarget || 3200}</span>
                </div>

                <div className="p-4 rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9]">
                  <span className="text-[10px] font-semibold text-[#6b7a74] uppercase tracking-wider block">
                    COMPLETED TRIPS
                  </span>
                  <span className="text-2xl font-bold text-[#193c34] font-mono mt-1 block">
                    {driverTrips.length}
                  </span>
                  <span className="text-[10px] text-[#193c34] font-semibold">100% Acceptance</span>
                </div>

                <div className="p-4 rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9]">
                  <span className="text-[10px] font-semibold text-[#6b7a74] uppercase tracking-wider block">
                    AVG. FARE PER TRIP
                  </span>
                  <span className="text-2xl font-bold text-[#193c34] font-mono mt-1 block">
                    ₹{driverTrips.length > 0 ? Math.round(driverTrips.reduce((acc, t) => acc + (t.fareInr || 0), 0) / driverTrips.length) : 480}
                  </span>
                  <span className="text-[10px] text-[#f87746] font-semibold">Includes surge pricing</span>
                </div>

                <div className="p-4 rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9]">
                  <span className="text-[10px] font-semibold text-[#6b7a74] uppercase tracking-wider block">
                    PARTNER RATING
                  </span>
                  <span className="text-2xl font-bold text-[#f87746] font-mono mt-1 block">
                    ★ 4.96
                  </span>
                  <span className="text-[10px] text-[#6b7a74]">Based on 2,840 trips</span>
                </div>
              </div>
            </div>

            {/* Trip Cards List */}
            <div className="space-y-3">
              {driverTrips.length === 0 ? (
                <div className="rounded-[28px] border border-[#e2e6de] bg-white p-12 text-center space-y-2 safar-card-shadow">
                  <Car className="h-10 w-10 text-[#6b7a74] mx-auto" />
                  <h4 className="text-sm font-semibold text-[#193c34]">No completed trips yet this shift</h4>
                  <p className="text-xs text-[#6b7a74]">
                    Switch to &apos;Driver Map&apos; and accept incoming dispatches from Phone 1 to log trips here!
                  </p>
                </div>
              ) : (
                driverTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="rounded-[20px] border border-[#e2e6de] bg-[#fbfbf9] p-4.5 hover:bg-white transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 safar-card-shadow text-[#193c34]"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-white border border-[#e2e6de] text-[#193c34] font-semibold">
                          {trip.id}
                        </span>
                        <span className="text-xs font-semibold text-[#193c34]">{trip.timestamp}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ecf1e8] text-[#193c34] text-[10px] font-semibold">
                          {trip.vehicleType ? trip.vehicleType.replace("UBER_", "Uber ") : "Uber Cab"}
                        </span>
                        {trip.surgeMultiplier > 1.0 && (
                          <span className="px-2 py-0.5 rounded-full bg-[#f87746]/10 text-[#f87746] font-mono text-[10px] font-bold border border-[#f87746]/30">
                            ⚡ {trip.surgeMultiplier}x Surge (+₹{trip.surgeBonusInr || Math.round(trip.fareInr * 0.3)})
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-[#ecf1e8] text-[#193c34] text-[10px] font-semibold">
                          ✓ Settled &bull; Cash Collected
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#193c34] pt-1 truncate">
                        <span className="text-[#6b7a74] truncate">{trip.pickupAddress}</span>
                        <ArrowRight className="h-3 w-3 text-[#6b7a74] shrink-0" />
                        <span className="font-semibold truncate">{trip.dropoffAddress}</span>
                      </div>

                      <div className="text-[11px] text-[#6b7a74] flex items-center gap-2 pt-0.5">
                        <span>Passenger: <strong className="text-[#193c34]">{trip.riderName || "Passenger"}</strong></span>
                        <span>&bull;</span>
                        <span>Payment: {trip.paymentMode || "UPI / Digital"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <span className="text-xl font-bold text-[#193c34] font-mono block">
                          ₹{trip.fareInr}
                        </span>
                        <span className="text-[10px] text-[#6b7a74] block font-mono">
                          Net Payout Credited
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoiceTrip(trip);
                          setIsInvoiceModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-full border border-[#e2e6de] bg-white hover:bg-[#ecf1e8] text-[#193c34] text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer safar-card-shadow"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#193c34]" />
                        <span>Receipt</span>
                      </button>
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

        {/* Tab 5: Michelangelo Predictive Surge Radar */}
        {activeTab === "radar" && (
          <div className="space-y-4 animate-fadeIn">
            <PredictiveRepositioningHUD
              driverCoords={currentProfile?.assignedCoordinates || [12.9788, 77.5996]}
              onRepositionSelect={(hotspot) => {
                setMapFlyToCoords(hotspot.coords);
                setActiveTab("map");
              }}
            />
          </div>
        )}

        {/* Tab 6: EV Charging Hub & Battery Telemetry */}
        {activeTab === "ev" && (
          <div className="space-y-4 animate-fadeIn">
            <EVChargingStationHUD
              driverCoords={currentProfile?.assignedCoordinates || [12.9788, 77.5996]}
              onRouteToStation={(station) => {
                setMapFlyToCoords(station.coords);
                setActiveTab("map");
              }}
            />
          </div>
        )}
      </main>

      {/* Official Tax Invoice & Carbon Credit Modal */}
      {selectedInvoiceTrip && (
        <CorporateInvoiceModal
          ride={selectedInvoiceTrip}
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

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
