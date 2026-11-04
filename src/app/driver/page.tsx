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
  const [activeTab, setActiveTab] = useState<"map" | "telemetry" | "benchmarks">("map");
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

  // AI Chat messages
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: "INIT_DRIVER_1",
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: "👋 नमस्ते राजेश जी! उबर पार्टनर पोर्टल सक्रिय है। चिन्नास्वामी स्टेडियम और एमजी रोड में 3.5x सर्ज चल रहा है। जैसे ही कोई राइडर बुक करेगा, आपको तुरंत अलर्ट मिलेगा!",
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

  // Real-Time Cross-Device Dispatch Polling (Listens for rides booked on Phone 1)
  useEffect(() => {
    if (activeTrip) return; // Driver already on trip

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
    }, 1200);

    return () => clearInterval(dispatchInterval);
  }, [activeTrip, incomingRideRequest]);

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

  const handleFlyToMySector = (coords: [number, number]) => {
    setMapFlyToCoords([...coords]);
    if (currentProfile?.primaryZone) {
      setSelectedZone(currentProfile.primaryZone as ZoneId);
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
  };

  // Accept Ride (Synced back to Rider Phone 1)
  const handleAcceptRide = async (request: RideRequest) => {
    setIncomingRideRequest(null);
    setActiveTrip(request);

    if (request.pickupCoords) {
      setMapFlyToCoords([...request.pickupCoords]);
    }

    // Sync with Custom Database so Rider on Phone 1 updates instantly!
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
        text: `🚖 **सवारी स्वीकार की गई!**\nयात्री: **${request.riderName}** (★ ${request.riderRating})\nपिकअप: **${request.pickupAddress}**\nकिराया: **₹${request.fareInr}** (सर्ज बोनस शामिल)\n\nनेविगेशन लाइव है। सुरक्षित यात्रा!`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const handleDeclineRide = async () => {
    if (incomingRideRequest) {
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

    // Update earnings in current profile & persist into custom database
    const newEarnings = (currentProfile?.currentEarnings || 2070) + trip.fareInr;

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
        text: `🎉 **यात्रा सफलतापूर्वक पूरी हुई!**\n💰 आपने इस ट्रिप से **₹${trip.fareInr}** कमाए।\nआज की कुल कमाई: **₹${newEarnings}**!`,
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

        {/* Tab 2: Michelangelo ML Telemetry */}
        {activeTab === "telemetry" && state && (
          <MichelangeloTelemetryView
            state={state}
            onTriggerScenario={handleTriggerScenario}
            isProcessing={isProcessing}
          />
        )}

        {/* Tab 3: System Benchmarks */}
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
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
