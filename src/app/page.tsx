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
import PredictiveRepositioningHUD from "@/components/uber/PredictiveRepositioningHUD";
import EVChargingStationHUD from "@/components/uber/EVChargingStationHUD";
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
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Compass,
  Gauge,
  Radio,
  Zap,
  Sparkles,
  Activity,
  Layers,
  Terminal,
} from "lucide-react";
import { updateRideInFirestore } from "@/lib/firebase/firestoreRides";
import { broadcastRideStatus } from "@/lib/uber/liveSync";

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

    const driverDetails = {
      driverName: currentProfile?.driverName || "Rajesh Kumar (Partner Driver)",
      driverPhone: "+91 98450 12890",
      driverRating: 4.96,
      vehicleModel: currentProfile?.vehicleModel || "Maruti Suzuki Dzire",
      licensePlate: currentProfile?.licensePlate || "KA 01 MJ 4829",
      driverAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      driverCoords: currentProfile?.assignedCoordinates || [12.9788, 77.5980],
    };

    // 1. Ultra-Low-Latency SSE/WebSocket broadcast (Sub-50ms instant trigger to Rider)
    broadcastRideStatus(request.id, "ACCEPTED", driverDetails).catch(() => {});
    // 2. Sync in real-time with Cloud Firestore
    updateRideInFirestore(request.id, "ACCEPTED", driverDetails).catch(() => {});

    // Sync accept back to Rider Phone 1
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

    // Broadcast cancellation across SSE & Firestore
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

  const handleCompleteTrip = async (trip: RideRequest) => {
    setActiveTrip(null);
    activeTripRef.current = null;

    // Broadcast completion to Rider Phone 1 in <50ms
    broadcastRideStatus(trip.id, "COMPLETED").catch(() => {});
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
      const userKey = typeof window !== "undefined" ? localStorage.getItem("uber_gemini_key") || "" : "";
      const res = await fetch("/api/uber/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          driverProfile: currentProfile,
          history: chatMessages.slice(-6),
          apiKey: userKey,
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

  // State for Safar-AI styled homepage interactive tabs & booking
  const [homeTab, setHomeTab] = useState<1 | 2 | 3>(1);
  const [homePickup, setHomePickup] = useState("M. Chinnaswamy Stadium, MG Road");
  const [homeDropoff, setHomeDropoff] = useState("Kempegowda Int'l Airport (BLR T2)");
  const [homeVehicle, setHomeVehicle] = useState<"UBER_GO" | "UBER_PREMIER" | "UBER_XL">("UBER_GO");
  const [isHomeBooking, setIsHomeBooking] = useState(false);
  const [homeBookingSuccess, setHomeBookingSuccess] = useState(false);
  const [isCopilotDrawerOpen, setIsCopilotDrawerOpen] = useState(false);

  // Primary Role Selection Gateway Flow: 100% Safar-AI Inspired Warm Minimalist Canvas
  if (gatewayView === "CHOICE") {
    return (
      <div className="min-h-screen bg-[#fafaf6] text-[#15342a] flex flex-col font-sans selection:bg-[#ecf2ea] selection:text-[#15342a]">
        {/* Safar-AI Top Navigation Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-[#e6e8e2] bg-[#fafaf6]/92 backdrop-blur-md px-6 py-4 sm:px-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            {/* Brand Logo */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#15342a] group-hover:text-[#1d4437] transition-colors">
                  ✳ UBER 2.0
                </span>
                <span className="hidden md:inline text-[9px] font-bold tracking-[0.2em] text-[#667069] uppercase pl-1 border-l border-[#dde2da]">
                  DISPATCH SMARTER. MOVE FREELY.
                </span>
              </Link>
            </div>

            {/* Center Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-[#15342a]">
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="hover:text-[#1d4437] transition-colors"
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => {
                  setHomeTab(1);
                  document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="hover:text-[#1d4437] transition-colors"
              >
                Plan your ride
              </button>
              <button
                type="button"
                onClick={() => {
                  setHomeTab(2);
                  document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="hover:text-[#1d4437] transition-colors"
              >
                Driver partner
              </button>
              <button
                type="button"
                onClick={() => {
                  setHomeTab(3);
                  document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="hover:text-[#1d4437] transition-colors"
              >
                Travel diaries
              </button>
              <Link href="/rider" className="hover:text-[#1d4437] transition-colors">
                Rider Portal
              </Link>
              <Link href="/driver" className="hover:text-[#1d4437] transition-colors">
                Driver App
              </Link>
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {}}
                className="p-2 rounded-full border border-[#e6e8e2] bg-white hover:bg-[#fafaf8] text-[#15342a] text-xs transition-colors"
                title="Toggle visual mode"
              >
                ☾
              </button>

              <button
                type="button"
                onClick={() => {
                  setHomeTab(3);
                  document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-3.5 py-1.5 rounded-full border border-[#e6e8e2] bg-white text-xs font-semibold text-[#15342a] safar-card-shadow hover:bg-[#fafaf8] transition-all"
              >
                My trips 0
              </button>

              <Link
                href="/rider"
                className="px-4 py-2 rounded-full bg-[#1d4437] hover:bg-[#15342a] text-white text-xs font-semibold transition-all safar-card-shadow flex items-center gap-1.5"
              >
                <span>Request ride ↗</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section (Safar-AI Styled) */}
        <section className="pt-14 sm:pt-20 pb-10 px-4 sm:px-8 max-w-5xl mx-auto w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ecf2ea] text-[11px] font-bold tracking-[0.2em] text-[#1d4437] uppercase">
            <span>✦ LESS WAITING. MORE LIVING.</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#15342a] tracking-tight leading-[1.08]">
            Explore the city,{" "}
            <span className="font-editorial italic font-normal text-[#1d4437]">
              your way.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#667069] max-w-2xl mx-auto leading-relaxed">
            Plan smarter, travel better, and create unforgettable journeys with guaranteed upfront fares. Your next ride starts here.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setHomeTab(1);
                document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-full bg-[#1d4437] hover:bg-[#15342a] text-white text-sm font-semibold transition-all safar-card-shadow flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Plan my ride ↗</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setHomeTab(2);
                document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="px-6 py-3 rounded-full border border-[#e6e8e2] bg-white hover:bg-[#fafaf8] text-[#15342a] text-sm font-semibold transition-all safar-card-shadow flex items-center gap-1.5 cursor-pointer"
            >
              <span>Drive &amp; earn →</span>
            </button>
          </div>

          <div className="pt-4 text-xs text-[#667069] flex items-center justify-center gap-2 flex-wrap font-medium">
            <span>☀️ 🚗 ⚡ 🛡️</span>
            <span>&bull;</span>
            <span>25,000+ happy riders</span>
            <span>&bull;</span>
            <span>Zero surge haggling</span>
            <span>&bull;</span>
            <span>Real-time GPS safety shield</span>
            <span>&bull;</span>
            <span className="text-[#1d4437] font-semibold">↗ BENGALURU, MUMBAI, DELHI NCR</span>
          </div>
        </section>

        {/* Popular City Hubs / Destinations Cards (Like Jibhi & Pondicherry in Safar-AI) */}
        <section className="px-4 sm:px-8 max-w-5xl mx-auto w-full pb-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1 */}
            <div className="rounded-[24px] border border-[#e6e8e2] bg-white p-6 safar-card-shadow flex flex-col justify-between space-y-4 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#15342a]">Kempegowda Int&apos;l Airport</h3>
                <p className="text-xs text-[#667069] leading-relaxed">
                  Express highway corridor, dedicated cab lanes, and executive sedans.
                </p>
              </div>
              <div className="border-t border-[#f0f2ee] pt-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#667069] uppercase tracking-wider block">
                    FAIR UPFRONT FARE FROM
                  </span>
                  <span className="text-lg font-bold text-[#15342a] font-mono">₹820 / trip &bull; est.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHomeDropoff("Kempegowda Int'l Airport (BLR T2)");
                    setHomeTab(1);
                    document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-full border border-[#e6e8e2] bg-[#fafaf6] hover:bg-[#ecf2ea] flex items-center justify-center text-[#15342a] transition-colors cursor-pointer"
                  title="Plan ride to Airport"
                >
                  ↗
                </button>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-[24px] border border-[#e6e8e2] bg-white p-6 safar-card-shadow flex flex-col justify-between space-y-4 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#15342a]">Bellandur Outer Ring Road</h3>
                <p className="text-xs text-[#667069] leading-relaxed">
                  Daily corporate shuttles, GST input tax credit, and zero wait times.
                </p>
              </div>
              <div className="border-t border-[#f0f2ee] pt-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#667069] uppercase tracking-wider block">
                    FAIR UPFRONT FARE FROM
                  </span>
                  <span className="text-lg font-bold text-[#15342a] font-mono">₹280 / trip &bull; est.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHomeDropoff("Bellandur Outer Ring Road Tech Corridor");
                    setHomeTab(1);
                    document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-full border border-[#e6e8e2] bg-[#fafaf6] hover:bg-[#ecf2ea] flex items-center justify-center text-[#15342a] transition-colors cursor-pointer"
                  title="Plan ride to Bellandur"
                >
                  ↗
                </button>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-[24px] border border-[#e6e8e2] bg-white p-6 safar-card-shadow flex flex-col justify-between space-y-4 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#15342a]">M. Chinnaswamy Stadium</h3>
                <p className="text-xs text-[#667069] leading-relaxed">
                  Michelangelo ML surge buffer: 65% fleet preserved for fair pricing.
                </p>
              </div>
              <div className="border-t border-[#f0f2ee] pt-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#667069] uppercase tracking-wider block">
                    FAIR UPFRONT FARE FROM
                  </span>
                  <span className="text-lg font-bold text-[#15342a] font-mono">₹340 / trip &bull; est.</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setHomeDropoff("M. Chinnaswamy Stadium & MG Road CBD");
                    setHomeTab(1);
                    document.getElementById("safar-canvas")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-9 h-9 rounded-full border border-[#e6e8e2] bg-[#fafaf6] hover:bg-[#ecf2ea] flex items-center justify-center text-[#15342a] transition-colors cursor-pointer"
                  title="Plan ride to Stadium"
                >
                  ↗
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-[#667069] pt-4">
            All prices are guaranteed upfront estimates per trip with zero driver renegotiation. Ratings are verified passenger scores.
          </p>
        </section>

        {/* The Signature Safar-AI Large Framed Canvas Container */}
        <section id="safar-canvas" className="px-4 sm:px-8 max-w-5xl mx-auto w-full pb-16">
          <div className="rounded-[32px] md:rounded-[36px] bg-white border border-[#e6e8e2] safar-card-shadow p-6 sm:p-10 md:p-12 space-y-8 text-left">
            {/* Canvas Header */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold tracking-[0.2em] text-[#667069] uppercase block">
                ONE PLATFORM. EVERY CHAPTER.
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-[#15342a] tracking-tight leading-tight">
                Plan it. Live it.{" "}
                <span className="font-editorial italic font-normal text-[#1d4437]">
                  Keep it.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[#667069]">
                Bengaluru &bull; 24/7 Verified Fleet &bull; Upfront Guaranteed Pricing &bull; Live GPS Safety Shield
              </p>
            </div>

            {/* The 3 Numbered Pill Tabs (EXACT Safar-AI Layout from screenshot) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setHomeTab(1)}
                className={`py-3.5 px-5 rounded-2xl font-semibold text-xs sm:text-sm transition-all text-left flex items-center gap-3 cursor-pointer ${
                  homeTab === 1
                    ? "bg-[#1d4437] text-white safar-card-shadow shadow-md"
                    : "border border-[#e6e8e2] bg-white text-[#15342a] hover:bg-[#fafaf8]"
                }`}
              >
                <span className={`font-mono text-xs ${homeTab === 1 ? "text-white/70" : "text-[#667069]"}`}>01</span>
                <span>Plan your ride</span>
              </button>

              <button
                type="button"
                onClick={() => setHomeTab(2)}
                className={`py-3.5 px-5 rounded-2xl font-semibold text-xs sm:text-sm transition-all text-left flex items-center gap-3 cursor-pointer ${
                  homeTab === 2
                    ? "bg-[#1d4437] text-white safar-card-shadow shadow-md"
                    : "border border-[#e6e8e2] bg-white text-[#15342a] hover:bg-[#fafaf8]"
                }`}
              >
                <span className={`font-mono text-xs ${homeTab === 2 ? "text-white/70" : "text-[#667069]"}`}>02</span>
                <span>Driver partner</span>
              </button>

              <button
                type="button"
                onClick={() => setHomeTab(3)}
                className={`py-3.5 px-5 rounded-2xl font-semibold text-xs sm:text-sm transition-all text-left flex items-center gap-3 cursor-pointer ${
                  homeTab === 3
                    ? "bg-[#1d4437] text-white safar-card-shadow shadow-md"
                    : "border border-[#e6e8e2] bg-white text-[#15342a] hover:bg-[#fafaf8]"
                }`}
              >
                <span className={`font-mono text-xs ${homeTab === 3 ? "text-white/70" : "text-[#667069]"}`}>03</span>
                <span>Travel diaries &amp; receipts</span>
              </button>
            </div>

            {/* Notification Status Banner */}
            <div className="rounded-xl bg-[#f2f4ec] text-[#2c4035] px-4 py-3 flex items-center justify-between text-xs font-medium">
              <div className="flex items-center gap-2">
                <span className="text-[#1d4437]">✦ One connected network</span>
                <span className="text-[#667069]">&bull;</span>
                <span>Bengaluru CBD &bull; 48 Active Cabs Nearby</span>
              </div>
              <Link href="/rider" className="text-[#1d4437] hover:underline flex items-center gap-1 font-semibold">
                <span>Launch full portal</span>
                <span>↗</span>
              </Link>
            </div>

            {/* TAB 1 CONTENT: Plan Your Ride */}
            {homeTab === 1 && (
              <div className="space-y-8 animate-fadeIn pt-2">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#f0f2ee] pb-6">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-[#667069] uppercase block">
                      YOUR RIDE. YOUR RULES.
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-extrabold text-[#15342a] tracking-tight">
                      A little input.{" "}
                      <span className="font-editorial italic font-normal text-[#1d4437] block sm:inline">
                        A whole lot of adventure.
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#667069] pt-0.5">
                      Bas batao, kahaan jaana hai? We&apos;ll put the pieces together.
                    </p>
                  </div>

                  <div className="max-w-xs text-right hidden md:block">
                    <p className="font-editorial italic text-base text-[#385244] leading-snug">
                      ✦ Built around your budget, your people, your pace.
                    </p>
                  </div>
                </div>

                {/* Step 01 Section & Form */}
                <div className="rounded-[28px] border border-[#e6e8e2] bg-[#fbfbf9] p-6 sm:p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#ecf2ea] text-[#1d4437] font-bold text-sm flex items-center justify-center shrink-0">
                      01
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#15342a]">Let&apos;s start with the essentials</h4>
                      <p className="text-xs text-[#667069]">No spreadsheets. No endless tabs. Upfront price protection.</p>
                    </div>
                  </div>

                  {/* Route Timeline Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#15342a] block">
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        value={homePickup}
                        onChange={(e) => setHomePickup(e.target.value)}
                        placeholder="Where from?"
                        className="w-full bg-white border border-[#e6e8e2] rounded-full px-4 py-3 text-xs text-[#15342a] placeholder-[#667069] focus:outline-none focus:border-[#1d4437] transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[#15342a] block">
                        Dropoff Destination
                      </label>
                      <input
                        type="text"
                        value={homeDropoff}
                        onChange={(e) => setHomeDropoff(e.target.value)}
                        placeholder="Where to?"
                        className="w-full bg-white border border-[#e6e8e2] rounded-full px-4 py-3 text-xs text-[#15342a] placeholder-[#667069] focus:outline-none focus:border-[#1d4437] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Vehicle Tiers */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#15342a] block">
                      Choose Your Ride Option
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {[
                        { id: "UBER_GO", name: "Uber Go", desc: "4 seats · Compact", price: "₹240", icon: "🚗" },
                        { id: "UBER_PREMIER", name: "Uber Premier", desc: "4 seats · Executive", price: "₹380", icon: "🚘" },
                        { id: "UBER_XL", name: "Uber XL", desc: "6 seats · Spacious SUV", price: "₹520", icon: "🚙" },
                      ].map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setHomeVehicle(v.id as any)}
                          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            homeVehicle === v.id
                              ? "border-[#1d4437] bg-white safar-card-shadow ring-1 ring-[#1d4437]"
                              : "border-[#e6e8e2] bg-white hover:border-[#1d4437]/40"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{v.icon}</span>
                            <div>
                              <span className="text-xs font-bold text-[#15342a] block">{v.name}</span>
                              <span className="text-[10px] text-[#667069]">{v.desc}</span>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-xs text-[#15342a]">{v.price}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Booking CTA */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#f0f2ee]">
                    <div className="text-xs text-[#667069]">
                      <span>Guaranteed price &bull; SAC 996412 Tax Invoice eligible</span>
                    </div>

                    <Link
                      href="/rider"
                      className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1d4437] hover:bg-[#15342a] text-white text-xs font-bold transition-all safar-card-shadow flex items-center justify-center gap-2"
                    >
                      <span>Continue to Book on Rider Portal</span>
                      <span>↗</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2 CONTENT: Driver Partner */}
            {homeTab === 2 && (
              <div className="space-y-8 animate-fadeIn pt-2">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#f0f2ee] pb-6">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-[#667069] uppercase block">
                      YOUR SHIFT. YOUR EARNINGS.
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-extrabold text-[#15342a] tracking-tight">
                      Drive on your own terms,{" "}
                      <span className="font-editorial italic font-normal text-[#1d4437] block sm:inline">
                        keep what you earn.
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#667069] pt-0.5">
                      Sub-50ms dispatch alerts, live turn-by-turn navigation HUD, and instant IMPS bank cashout.
                    </p>
                  </div>

                  <div className="max-w-xs text-right hidden md:block">
                    <p className="font-editorial italic text-base text-[#385244] leading-snug">
                      ✦ 100% transparent payouts with zero surprise fees.
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#e6e8e2] bg-[#fbfbf9] p-6 sm:p-8 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-[#e6e8e2] safar-card-shadow space-y-1">
                      <span className="text-[10px] text-[#667069] font-bold uppercase tracking-wider block">
                        TODAY&apos;S SHIFT TARGET
                      </span>
                      <span className="text-2xl font-bold text-[#15342a] font-mono block">₹3,200</span>
                      <span className="text-[10px] text-[#1d4437]">Avg. hourly rate: ₹420/hr</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#e6e8e2] safar-card-shadow space-y-1">
                      <span className="text-[10px] text-[#667069] font-bold uppercase tracking-wider block">
                        ACTIVE SURGE BONUS
                      </span>
                      <span className="text-2xl font-bold text-[#f87746] font-mono block">3.5x Multiplier</span>
                      <span className="text-[10px] text-[#667069]">Chinnaswamy Stadium &bull; Event Wave</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-[#e6e8e2] safar-card-shadow space-y-1">
                      <span className="text-[10px] text-[#667069] font-bold uppercase tracking-wider block">
                        INSTANT CASHOUT
                      </span>
                      <span className="text-2xl font-bold text-[#1d4437] font-mono block">IMPS Fast</span>
                      <span className="text-[10px] text-[#667069]">Direct to verified bank account</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#f0f2ee]">
                    <span className="text-xs text-[#667069]">
                      Ready to accept trips? Switch to Driver App on Phone 2
                    </span>

                    <Link
                      href="/driver"
                      className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1d4437] hover:bg-[#15342a] text-white text-xs font-bold transition-all safar-card-shadow flex items-center justify-center gap-2"
                    >
                      <span>Launch Driver Partner App</span>
                      <span>↗</span>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3 CONTENT: Travel Diaries & Tax Invoices */}
            {homeTab === 3 && (
              <div className="space-y-8 animate-fadeIn pt-2">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#f0f2ee] pb-6">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold tracking-[0.2em] text-[#667069] uppercase block">
                      TRAVEL DIARIES AI — CAPTURE, VERIFY &amp; CLAIM
                    </span>
                    <h3 className="text-2xl sm:text-4xl font-extrabold text-[#15342a] tracking-tight">
                      Some moments deserve{" "}
                      <span className="font-editorial italic font-normal text-[#1d4437] block sm:inline">
                        more than a camera roll.
                      </span>
                    </h3>
                    <p className="text-xs sm:text-sm text-[#667069] pt-0.5">
                      Your itinerary becomes an album. Your verified rides become corporate tax invoices.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs px-3 py-1.5 rounded-full bg-[#ecf2ea] text-[#1d4437] font-medium border border-[#dde2da]">
                      ▢ Device-only storage &bull; Private
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#ebe4d8] bg-[#f7f3ec] p-4 text-xs text-[#5c5245] space-y-1 leading-relaxed">
                  <span className="font-bold block">Tax Compliance &bull; SAC 996412:</span>
                  <p>
                    All commercial rides include 5% GST Input Tax Credit (ITC) eligibility. Download official corporate invoices with QR codes for your accounting.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: "UBR-7281", from: "Indiranagar 100ft Rd", to: "Kempegowda Int'l Airport", fare: "₹820", time: "Today, 08:30 AM", status: "Verified &bull; Paid" },
                    { id: "UBR-6192", from: "Koramangala 4th Block", to: "Bellandur Tech Corridor", fare: "₹240", time: "Yesterday, 06:15 PM", status: "Verified &bull; Paid" },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#e6e8e2] bg-[#fbfbf9] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#e6e8e2] text-[#15342a]">
                            {item.id}
                          </span>
                          <span className="text-[#667069]">{item.time}</span>
                          <span className="text-[#1d4437] font-semibold">{item.status}</span>
                        </div>
                        <div className="text-[#15342a] font-medium">
                          {item.from} &rarr; {item.to}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-mono font-bold text-sm text-[#15342a]">{item.fare}</span>
                        <Link
                          href="/rider"
                          className="px-3.5 py-1.5 rounded-full border border-[#e6e8e2] bg-white text-[#15342a] hover:bg-[#ecf2ea] font-semibold text-xs transition-colors"
                        >
                          View Invoice
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 3 Articles Row (Safar-AI Discover / Plan / Go layout) */}
        <section className="px-4 sm:px-8 max-w-5xl mx-auto w-full pb-16 space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-bold tracking-[0.2em] text-[#667069] uppercase block">
              SMALL TEAM. BIG DISPATCH.
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#15342a] tracking-tight">
              Mobility should feel like freedom.
            </h2>
            <p className="text-xs sm:text-sm text-[#667069] max-w-xl mx-auto">
              Uber 2.0 brings your destinations, drivers and rupees together in one beautiful place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 text-left">
            <div className="rounded-[24px] border border-[#e6e8e2] bg-white p-6 safar-card-shadow space-y-2">
              <span className="text-[11px] font-mono text-[#667069] font-bold">01 / DISPATCH</span>
              <h4 className="text-lg font-bold text-[#15342a]">Find your ride.</h4>
              <p className="text-xs text-[#667069] leading-relaxed">
                Predictive fleet matching and dynamic pricing that balances passenger demand with fair driver earnings.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#e6e8e2] bg-white p-6 safar-card-shadow space-y-2">
              <span className="text-[11px] font-mono text-[#667069] font-bold">02 / SAFETY</span>
              <h4 className="text-lg font-bold text-[#15342a]">Safety Sentinel.</h4>
              <p className="text-xs text-[#667069] leading-relaxed">
                4-digit mutual OTP verification, 24/7 crash detection, route drift monitor, and instant SOS alerts.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#e6e8e2] bg-white p-6 safar-card-shadow space-y-2">
              <span className="text-[11px] font-mono text-[#667069] font-bold">03 / GO</span>
              <h4 className="text-lg font-bold text-[#15342a]">More moments. Less stress.</h4>
              <p className="text-xs text-[#667069] leading-relaxed">
                Automated GST invoices, expense tagging for teams, and verified carbon credit offset tracking.
              </p>
            </div>
          </div>
        </section>

        {/* Editorial Quote Banner */}
        <section className="px-4 sm:px-8 max-w-4xl mx-auto w-full pb-16 text-center space-y-3">
          <span className="text-4xl text-[#1d4437] font-serif">&ldquo;</span>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-[#15342a] tracking-tight leading-snug">
            The best part of city travel? Getting there without the stress.
          </h3>
          <p className="text-xs sm:text-sm text-[#667069] max-w-lg mx-auto">
            Start yours with upfront guaranteed pricing that leaves zero room for haggling.
          </p>
        </section>

        {/* Contact / Help Section */}
        <section className="px-4 sm:px-8 max-w-5xl mx-auto w-full pb-16">
          <div className="rounded-[28px] border border-[#e6e8e2] bg-white p-8 sm:p-10 safar-card-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-[0.2em] text-[#667069] uppercase block">
                LET&apos;S GET YOU OUT THERE
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#15342a] tracking-tight">
                Your next journey is one tap away.
              </h3>
              <p className="text-xs text-[#667069]">
                +91 88878 84955 &bull; Questions, support, or instant dispatch assistance.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/rider"
                className="px-5 py-2.5 rounded-full bg-[#1d4437] hover:bg-[#15342a] text-white text-xs font-semibold safar-card-shadow transition-colors"
              >
                Book a Ride ↗
              </Link>
              <button
                type="button"
                onClick={() => setGatewayView("WORKSPACE")}
                className="px-5 py-2.5 rounded-full border border-[#e6e8e2] bg-white hover:bg-[#fafaf8] text-[#15342a] text-xs font-semibold transition-colors cursor-pointer"
              >
                Developer Console →
              </button>
            </div>
          </div>
        </section>

        {/* Minimal Editorial Footer */}
        <footer className="border-t border-[#e6e8e2] bg-[#fafaf6] py-10 px-6 sm:px-10 text-xs text-[#667069] text-left">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="font-bold text-[#15342a] text-sm block">✳ UBER 2.0</span>
              <p className="text-[11px]">Go places. Move freely. Michelangelo ML Platform.</p>
            </div>

            <div className="flex items-center gap-5 text-[11px] font-semibold text-[#15342a]">
              <Link href="/rider" className="hover:underline">Rider App</Link>
              <Link href="/driver" className="hover:underline">Driver App</Link>
              <button
                type="button"
                onClick={() => setGatewayView("WORKSPACE")}
                className="hover:underline cursor-pointer"
              >
                Operations Workspace
              </button>
            </div>

            <p className="text-[10px] text-[#667069]">
              &copy; 2026 UBER 2.0 &bull; Hackathon prototype &bull; All trips insured &amp; tracked.
            </p>
          </div>
        </footer>

        {/* Floating Action Pill in Bottom Right Corner (Safar-AI Signature) */}
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => setIsCopilotDrawerOpen(!isCopilotDrawerOpen)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#1d4437] hover:bg-[#15342a] text-white text-xs font-semibold shadow-2xl transition-all cursor-pointer group safar-card-shadow active:scale-95"
          >
            <span>✦</span>
            <span>{isCopilotDrawerOpen ? "Close Copilot" : "Ask Uber Copilot"}</span>
          </button>
        </div>

        {/* Floating Copilot Drawer */}
        {isCopilotDrawerOpen && (
          <div className="fixed bottom-20 right-4 sm:right-6 w-[94vw] sm:w-[420px] max-h-[75vh] z-50 rounded-[28px] border border-[#e6e8e2] bg-white safar-card-shadow overflow-hidden flex flex-col text-left">
            <div className="flex items-center justify-between p-3.5 border-b border-[#e6e8e2] bg-[#fafaf6]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#ecf2ea] text-[#1d4437] text-[10px] font-bold">
                  ● Active
                </span>
                <span className="font-bold text-xs text-[#15342a]">Uber AI Assistant</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCopilotDrawerOpen(false)}
                className="text-[#667069] hover:text-[#15342a] text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 overflow-y-auto max-h-[60vh]">
              <DriverAssistantChat
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
              />
            </div>
          </div>
        )}
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

            {/* TAB 5: MICHELANGELO PREDICTIVE SURGE RADAR */}
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

            {/* TAB 6: EV CHARGING HUB & BATTERY TELEMETRY */}
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
