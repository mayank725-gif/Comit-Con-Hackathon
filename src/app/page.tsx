"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import UberNavbar, { UberTab, PortalMode } from "@/components/uber/UberNavbar";
import CustomerPortalView from "@/components/uber/CustomerPortalView";
import DriverAssistantChat from "@/components/uber/DriverAssistantChat";
import UberBenchmarkView from "@/components/uber/UberBenchmarkView";
import MichelangeloTelemetryView from "@/components/uber/MichelangeloTelemetryView";
import DriverSectorSpotlight from "@/components/uber/DriverSectorSpotlight";
import DriverAuthModal from "@/components/uber/DriverAuthModal";
import IncomingRideDispatchModal from "@/components/uber/IncomingRideDispatchModal";
import ActiveTripHUD from "@/components/uber/ActiveTripHUD";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import { saveDriverProfileToCustomDb } from "@/lib/firebase/authService";
import {
  MarketplaceState,
  ZoneId,
  AssistantMessage,
  RideRequest,
} from "@/lib/uber/types";
import { UBER_BENCHMARK_DATA } from "@/lib/uber/benchmark";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { updateRideInFirestore } from "@/lib/firebase/firestoreRides";

// Dynamic import with ssr: false for Leaflet real map
const RealLeafletMap = dynamic(
  () => import("@/components/uber/RealLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[580px] rounded-3xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center space-y-2">
        <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-zinc-400">
          Loading Live Map & Traffic...
        </span>
      </div>
    ),
  }
);

export default function Home() {
  const [gatewayView, setGatewayView] = useState<"CHOICE" | "WORKSPACE">("CHOICE");
  const [portalMode, setPortalMode] = useState<PortalMode>("CUSTOMER");
  const [activeTab, setActiveTab] = useState<UberTab>("map");
  const [state, setState] = useState<MarketplaceState | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneId | null>("STADIUM");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Driver Authentication & Work Area State (Self-hosted Custom Database)
  const [currentUser, setCurrentUser] = useState<DriverUser | null>(null);
  const [currentProfile, setCurrentProfile] = useState<DriverWorkProfile | null>(null);
  const [sectorTelemetry, setSectorTelemetry] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [mapFlyToCoords, setMapFlyToCoords] = useState<[number, number] | null>(null);

  // Uber 2.0 Two-Sided Marketplace & Dispatch State
  const [incomingRideRequest, setIncomingRideRequest] = useState<RideRequest | null>(null);
  const [activeTrip, setActiveTrip] = useState<RideRequest | null>(null);

  // References to prevent duplicate dispatches, ghost re-alerts on decline, or alerts while on trip
  const declinedRideIdsRef = React.useRef<Set<string>>(new Set());
  const activeTripRef = React.useRef<RideRequest | null>(null);
  const [isOnDuty, setIsOnDuty] = useState(true);
  const isOnDutyRef = React.useRef<boolean>(true);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  useEffect(() => {
    isOnDutyRef.current = isOnDuty;
  }, [isOnDuty]);

  // Chat conversation
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: "INIT_1",
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: "👋 नमस्ते! उबर 2.0 स्मार्ट मार्केट इंजन सक्रिय है। चिन्नास्वामी स्टेडियम और एमजी रोड में अभी सबसे ज्यादा किराए की राइड्स मिल रही हैं। आप माइक दबाकर हिंदी या English में कुछ भी पूछ सकते हैं!",
      timestamp: "2026-11-03T23:00:00.000Z",
      actionableRecommendation: {
        suggestedZone: "STADIUM",
        estimatedSurge: 3.5,
        extraEarningsEstimate: "+₹350 - ₹550 / trip",
      },
      routingTrace: {
        confidenceScore: 0.985,
        tokensEvaluated: 130,
        featuresQueried: ["india_hex_demand_surge", "driver_shift_pacing", "live_google_traffic_congestion"],
        latencyMs: 5.4,
      },
    },
  ]);

  // Initial load
  useEffect(() => {
    fetchState();
    fetchDriverSession();
  }, []);

  // Live simulation ticker (advances every 1.0s for continuous real-time animation)
  useEffect(() => {
    let isTicking = false;
    const timer = setInterval(async () => {
      if (isTicking) return;
      isTicking = true;
      try {
        await tickSimulation();
      } finally {
        isTicking = false;
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
      }
    } catch (e) {
      console.error("Failed to fetch driver session:", e);
    }
  };

  const tickSimulation = async () => {
    try {
      const res = await fetch("/api/uber/tick", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (e) {
      console.error("Tick error:", e);
    }
  };

  const handleAuthSuccess = (user: DriverUser, profile: DriverWorkProfile) => {
    setCurrentUser(user);
    setCurrentProfile(profile);
    if (profile.assignedCoordinates) {
      setMapFlyToCoords([...profile.assignedCoordinates]);
    }
    if (profile.primaryZone) {
      setSelectedZone(profile.primaryZone as ZoneId);
    }
    fetchDriverSession();

    const remainingTarget = Math.max(0, (profile.dailyEarningsTarget || 3000) - (profile.currentEarnings || 0));
    setChatMessages((prev) => [
      ...prev,
      {
        id: `AUTH_${Date.now()}`,
        sender: "ASSISTANT",
        agentType: "DISPATCH",
        text: `🎉 **सफलतापूर्वक लॉगिन हुआ!** नमस्ते, ड्राइवर **${profile.driverName}** जी!\n\n📍 आपका कार्यक्षेत्र **${profile.primaryZoneName}** (${profile.cityName}) और वाहन **${profile.vehicleModel} (${profile.licensePlate})** सक्रिय है।\n💰 आज की कमाई: **₹${profile.currentEarnings}** | आज का दैनिक लक्ष्य: **₹${profile.dailyEarningsTarget}** (बाकी: **₹${remainingTarget}**)। माइकल एंजेलो एआई आपके कार्यक्षेत्र में सर्वाधिक किराए की राइड्स प्राथमिकता पर रूट कर रहा है!`,
        timestamp: new Date().toISOString(),
        actionableRecommendation: {
          suggestedZone: (profile.primaryZone as ZoneId) || "STADIUM",
          estimatedSurge: 3.2,
          extraEarningsEstimate: `Targeting ₹${profile.dailyEarningsTarget}/day`,
        },
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      setCurrentProfile(null);
      setSectorTelemetry(null);
      setIsAuthModalOpen(false);
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  const handleFlyToMySector = (coords: [number, number]) => {
    setMapFlyToCoords([...coords]);
    if (currentProfile?.primaryZone) {
      setSelectedZone(currentProfile.primaryZone as ZoneId);
    }
  };

  // Uber 2.0 Ride Request Handlers (Two-Sided Marketplace & Custom Database Sync)
  const handleRequestRide = async (request: RideRequest) => {
    setIncomingRideRequest(request);
    try {
      await fetch("/api/uber/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
    } catch (e) {
      console.error("Failed to persist ride to custom database:", e);
    }
  };

  // Cross-device polling: Listen for dispatches booked on Phone 1 (/rider)
  useEffect(() => {
    if (activeTrip || portalMode !== "DRIVER") return;

    const interval = setInterval(async () => {
      if (activeTripRef.current || !isOnDutyRef.current) return; // Never show new dispatch if on active trip or offline
      try {
        const res = await fetch("/api/uber/rides");
        const data = await res.json();
        if (data.success && data.activeRide) {
          const active: RideRequest = data.activeRide;
          if (
            (active.status === "REQUESTED" || active.status === "PENDING") &&
            !declinedRideIdsRef.current.has(active.id) &&
            (!incomingRideRequest || incomingRideRequest.id !== active.id)
          ) {
            setIncomingRideRequest(active);
          }
        }
      } catch (e) {
        // ignore
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [activeTrip, incomingRideRequest, portalMode]);

  const handleAcceptRide = async (request: RideRequest) => {
    setIncomingRideRequest(null);
    setActiveTrip(request);
    activeTripRef.current = request;

    // Fly map to pickup/dropoff
    if (request.pickupCoords) {
      setMapFlyToCoords([...request.pickupCoords]);
    }

    // Sync accept back to Rider Phone 1
    try {
      await fetch("/api/uber/rides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId: request.id,
          status: "ACCEPTED",
          driverDetails: {
            driverName: currentProfile?.driverName || "Rajesh Kumar (Partner Driver)",
            driverPhone: "+91 98450 12890",
            driverRating: 4.96,
            vehicleModel: currentProfile?.vehicleModel || "Maruti Suzuki Dzire",
            licensePlate: currentProfile?.licensePlate || "KA 01 MJ 4829",
            driverAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            driverCoords: currentProfile?.assignedCoordinates || [12.9788, 77.5980],
          },
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
        text: `🚖 **सवारी स्वीकार की गई!**\nयात्री: **${request.riderName}** (★ ${request.riderRating})\nपिकअप: **${request.pickupAddress}**\nगंतव्य: **${request.dropoffAddress}**\nकिराया: **₹${request.fareInr}** (सर्ज बोनस शामिल: ₹${request.surgeBonusInr})\n\nनेविगेशन लाइव है। सुरक्षित यात्रा!`,
        timestamp: new Date().toISOString(),
        actionableRecommendation: {
          suggestedZone: selectedZone || "STADIUM",
          estimatedSurge: request.surgeMultiplier,
          extraEarningsEstimate: `Earn ₹${request.fareInr}`,
        },
      },
    ]);
  };

  const handleDeclineRide = async () => {
    if (!incomingRideRequest) return;
    const decliningId = incomingRideRequest.id;

    // Permanently remember declined ID in session so it never pops up again
    declinedRideIdsRef.current.add(decliningId);
    setIncomingRideRequest(null);

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

  const handleCompleteTrip = async (trip: RideRequest) => {
    setActiveTrip(null);
    activeTripRef.current = null;

    // Sync in real-time with Cloud Firestore
    updateRideInFirestore(trip.id, "COMPLETED").catch(() => {});

    // Sync trip completion back to Rider Phone 1
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

    // Update earnings in current profile & persist into custom database
    const newEarnings = ((currentProfile?.currentEarnings) || 2070) + trip.fareInr;

    if (currentUser && currentProfile) {
      const updatedProfile: DriverWorkProfile = {
        ...currentProfile,
        currentEarnings: newEarnings,
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
        });
      } catch (e) {
        console.error("Failed to persist trip earnings:", e);
      }
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `FINISH_${Date.now()}`,
        sender: "ASSISTANT",
        agentType: "EARNINGS",
        text: `🎉 **यात्रा सफलतापूर्वक पूरी हुई!**\n💰 आपने इस ट्रिप से **₹${trip.fareInr}** कमाए।\nआज की कुल कमाई: **₹${newEarnings}**। आपका दैनिक लक्ष्य तेजी से पूरा हो रहा है!`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleTriggerScenario = async (
    type: "STADIUM_CONCERT_END" | "STALE_MODEL_DRIFT" | "AIRPORT_FLIGHT_WAVE" | "MONSOON_FLASH_FLOOD" | "RESET"
  ) => {
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
        const scenario = data.scenarioApplied;
        if (scenario === "STADIUM_CONCERT_END") {
          setSelectedZone("STADIUM");
          setChatMessages((prev) => [
            ...prev,
            {
              id: `SCEN_${Date.now()}`,
              sender: "ASSISTANT",
              agentType: "EVENT_INTEL",
              text: "🚨 **IPL MATCH SURGE ALERT**: IPL match concluded at M. Chinnaswamy Stadium. 40,000 spectators exiting! Surge multiplier jumped to 3.5x. Recommended to reposition nearby.",
              timestamp: new Date().toISOString(),
              actionableRecommendation: {
                suggestedZone: "STADIUM",
                estimatedSurge: 3.5,
                extraEarningsEstimate: "+₹350 - ₹550 / trip",
              },
            },
          ]);
        } else if (scenario === "MONSOON_FLASH_FLOOD") {
          setSelectedZone("TECH_PARK");
          setChatMessages((prev) => [
            ...prev,
            {
              id: `SCEN_${Date.now()}`,
              sender: "ASSISTANT",
              agentType: "SYSTEM_GUARD",
              text: "🌧️ **MONSOON FLASH FLOOD**: Severe waterlogging detected along Outer Ring Road. Speeds reduced; vehicles routed via elevated corridors. Surge raised to 2.9x.",
              timestamp: new Date().toISOString(),
              actionableRecommendation: {
                suggestedZone: "TECH_PARK",
                estimatedSurge: 2.9,
                extraEarningsEstimate: "+₹280 wet weather bonus",
              },
            },
          ]);
        }
      }
    } catch (e) {
      console.error("Scenario trigger error:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (query: string) => {
    setIsChatLoading(true);
    const userMsg: AssistantMessage = {
      id: `USER_${Date.now()}`,
      sender: "DRIVER",
      text: query,
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("/api/uber/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          driverProfile: currentProfile,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setChatMessages((prev) => [...prev, data.message]);
      }
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <span className="text-xs font-mono text-zinc-400">
          Starting Uber 2.0 Real-Time Marketplace Engine...
        </span>
      </div>
    );
  }

  const focusedZone = selectedZone ? state.zones[selectedZone] : null;

  // Primary Role Selection Gateway Flow: "Are you riding or driving today?"
  if (gatewayView === "CHOICE") {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
        {/* Gateway Minimal Brand Header */}
        <header className="w-full border-b border-zinc-800 bg-black/95 px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black tracking-tighter text-white">Uber</span>
              <span className="rounded-md bg-white text-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Michelangelo
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-zinc-400 font-bold hidden sm:inline">
                Marketplace Live &bull; Custom DB Synced
              </span>
            </div>
          </div>
        </header>

        {/* Hero Role Selection Gateway */}
        <main className="flex-1 flex flex-col justify-center items-center py-10 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-8 animate-fadeIn">
          {/* Header Title */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ROLE SELECTION GATEWAY</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Are you riding or driving today?
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto">
              Select your role to access your dedicated mobile portal with mandatory authentication, live two-way synchronization, and persistent ride history.
            </p>
          </div>

          {/* Two Massive Interactive Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
            {/* Card 1: Rider */}
            <Link
              href="/rider"
              className="group relative rounded-3xl border-2 border-zinc-800 bg-zinc-950 p-7 hover:border-white transition-all duration-300 shadow-2xl flex flex-col justify-between space-y-6 hover:scale-[1.01]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                    🚖
                  </div>
                  <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-300">
                    Phone 1 Portal
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white group-hover:text-emerald-400 transition-colors">
                    I am a Rider
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Book cabs, monitor live surge handling, track driver ETA, and view trip tax invoices.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 border-t border-zinc-800/80 pt-4 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Mandatory Rider sign-in with 1-click profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Guaranteed upfront fare &amp; 3.8x anti-gouging surge cap</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Multi-arterial crowd dispersal &amp; staggered waves</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Persistent &apos;My Trips&apos; history &amp; GST tax invoices</span>
                  </li>
                </ul>
              </div>

              <div className="w-full py-3.5 px-4 rounded-2xl bg-white group-hover:bg-zinc-200 text-black font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg">
                <span>Continue as Rider</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Card 2: Driver */}
            <Link
              href="/driver"
              className="group relative rounded-3xl border-2 border-zinc-800 bg-zinc-950 p-7 hover:border-amber-400 transition-all duration-300 shadow-2xl flex flex-col justify-between space-y-6 hover:scale-[1.01]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 text-black flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform">
                    🚗
                  </div>
                  <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-amber-300">
                    Phone 2 Portal
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-white group-hover:text-amber-400 transition-colors">
                    I am a Driver Partner
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Receive incoming dispatches, verify passenger OTP, pace shift earnings, and view trip logs.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-zinc-300 border-t border-zinc-800/80 pt-4 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Mandatory Driver sign-in &amp; work territory setup</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Real-time dispatch alerts with audio ring chime</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Live GPS navigation HUD &amp; OTP safety verification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Shift Trip Log with automated gross &amp; net payouts</span>
                  </li>
                </ul>
              </div>

              <div className="w-full py-3.5 px-4 rounded-2xl bg-amber-400 group-hover:bg-amber-300 text-black font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg">
                <span>Continue as Driver Partner</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Desktop Dual Console Trigger */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setGatewayView("WORKSPACE")}
              className="text-xs text-zinc-400 hover:text-white underline underline-offset-4 font-medium transition-colors cursor-pointer"
            >
              💻 Testing on a single laptop? Open Dual Desktop Workspace Console &rarr;
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
      <UberNavbar
        portalMode={portalMode}
        onPortalModeChange={setPortalMode}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        modelHealth={state.modelHealth}
        onTriggerScenario={handleTriggerScenario}
        isProcessing={isProcessing}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenStressTest={() => handleTriggerScenario("STADIUM_CONCERT_END")}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* Switch Role Back to Gateway */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setGatewayView("CHOICE")}
            className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>&larr; Switch Role / Back to Gateway</span>
          </button>
        </div>

        {/* TWO-PHONE LIVE DEMO PRESENTATION BANNER */}
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                TWO-PHONE LIVE DEMONSTRATION MODE
              </span>
            </div>
            <p className="text-xs text-zinc-300">
              Open <strong className="text-white">/rider</strong> on Phone 1 and <strong className="text-white">/driver</strong> on Phone 2 to experience live cross-phone ride booking, instant dispatch alerts, and trip completion!
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
            <a
              href="/rider"
              className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>📱 Phone 1 (Rider)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            <a
              href="/driver"
              className="flex-1 md:flex-none px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>🚗 Phone 2 (Driver)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* CUSTOMER RIDE BOOKING PORTAL */}
        {portalMode === "CUSTOMER" && (
          <CustomerPortalView
            state={state}
            onBookRide={handleRequestRide}
            onSwitchToDriver={() => setPortalMode("DRIVER")}
            onTriggerScenario={handleTriggerScenario}
          />
        )}

        {/* DRIVER PARTNER PORTAL */}
        {portalMode === "DRIVER" && (
          <>
            {/* TAB 1: REAL DRIVER MAP & TWO-SIDED COPILOT */}
            {activeTab === "map" && (
              <div className="space-y-4">
                {/* Sleek Compact Driver HUD (Takes minimal vertical space) */}
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
                  {/* Left 7 Cols: Clean Leaflet Map + Active Trip Navigation Bar */}
                  <div className="lg:col-span-7 space-y-3">
                    <RealLeafletMap
                      state={state}
                      selectedZone={selectedZone}
                      onSelectZone={setSelectedZone}
                      flyToCoords={mapFlyToCoords}
                    />

                    {/* Active Trip Navigation HUD (When Ride is In-Progress) */}
                    {activeTrip && (
                      <ActiveTripHUD
                        trip={activeTrip}
                        onCompleteTrip={handleCompleteTrip}
                      />
                    )}

                    {/* Selected Hotspot Card (Clean, Simple Drawer) */}
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
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 mt-2 border-t border-zinc-800 text-xs">
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2 text-center">
                            <span className="text-[10px] text-zinc-400 block">Riders Looking</span>
                            <span className="text-sm font-bold text-white">{focusedZone.currentDemand}</span>
                          </div>
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2 text-center">
                            <span className="text-[10px] text-zinc-400 block">Available Cabs</span>
                            <span className="text-sm font-bold text-emerald-400">{focusedZone.activeDrivers}</span>
                          </div>
                          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-2 text-center">
                            <span className="text-[10px] text-rose-300 block">Pickup Chance</span>
                            <span className="text-sm font-bold text-rose-400">Instant</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 5 Cols: Driver Copilot Assistant */}
                  <div className="lg:col-span-5 space-y-3">
                    <DriverAssistantChat
                      messages={chatMessages}
                      onSendMessage={handleSendMessage}
                      isLoading={isChatLoading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DEDICATED FULL-SCREEN VOICE COPILOT */}
            {activeTab === "copilot" && (
              <div className="max-w-3xl mx-auto space-y-4">
                <DriverAssistantChat
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isLoading={isChatLoading}
                />
              </div>
            )}

            {/* TAB 3: SHIFT EARNINGS & BENCHMARKS */}
            {activeTab === "benchmark" && (
              <div className="space-y-6">
                {/* 4 Big KPI Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1 backdrop-blur-sm shadow-md">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      💰 Driver Hourly Earnings
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        ₹{state.metrics.avgDriverHourlyRate}/hr
                      </span>
                      <span className="text-xs font-bold text-emerald-400">+64% Boost</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      vs ₹280/hr normal driving without AI
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1 backdrop-blur-sm shadow-md">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      🚕 Active Fleet Online
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white">
                        {state.drivers.length} Cabs Online
                      </span>
                      <span className="text-xs font-bold text-emerald-400">6 Metros</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      Delhi &bull; Mumbai &bull; Bengaluru &bull; Hyd &bull; Chennai &bull; Kol
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1 backdrop-blur-sm shadow-md">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      ⚡ High-Demand Peak Surge
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400">
                        {state.metrics.cityAvgSurge}x
                      </span>
                      <span className="text-xs font-bold text-amber-300">Average</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      Peak: {state.zones.MUMBAI_BKC?.surgeMultiplier || 1.6}x at Mumbai BKC
                    </span>
                  </div>

                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-1 backdrop-blur-sm shadow-md">
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      🚦 City Traffic Condition
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-emerald-400">
                        {state.metrics.transitNetworkHealthPercent}%
                      </span>
                      <span className="text-xs font-bold text-emerald-300">Clear Flow</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block truncate">
                      Smart bypass routes avoid traffic jams
                    </span>
                  </div>
                </div>

                <UberBenchmarkView stats={UBER_BENCHMARK_DATA} />
              </div>
            )}

            {/* TAB 4: MICHELANGELO ML & FEATURE STORE OBSERVABILITY */}
            {activeTab === "telemetry" && (
              <MichelangeloTelemetryView
                state={state}
                onTriggerScenario={handleTriggerScenario}
                isProcessing={isProcessing}
              />
            )}
          </>
        )}
      </main>

      {/* Uber 2.0 Incoming Ride Dispatch Modal (Driver Alert) */}
      <IncomingRideDispatchModal
        request={incomingRideRequest}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
      />

      {/* Driver Google Auth & Work Area Onboarding Modal */}
      <DriverAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />
    </div>
  );
}
