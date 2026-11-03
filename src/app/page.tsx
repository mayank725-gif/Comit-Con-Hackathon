"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import UberNavbar, { UberTab } from "@/components/uber/UberNavbar";
import DriverAssistantChat from "@/components/uber/DriverAssistantChat";
import UberBenchmarkView from "@/components/uber/UberBenchmarkView";
import MichelangeloTelemetryView from "@/components/uber/MichelangeloTelemetryView";
import DriverSectorSpotlight from "@/components/uber/DriverSectorSpotlight";
import DriverAuthModal from "@/components/uber/DriverAuthModal";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import {
  MarketplaceState,
  ZoneId,
  AssistantMessage,
} from "@/lib/uber/types";
import { UBER_BENCHMARK_DATA } from "@/lib/uber/benchmark";

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

  // Chat conversation
  const [chatMessages, setChatMessages] = useState<AssistantMessage[]>([
    {
      id: "INIT_1",
      sender: "ASSISTANT",
      agentType: "DISPATCH",
      text: "👋 नमस्ते! उबर ड्राइवर स्मार्ट कॉपायलट सक्रिय है। चिन्नास्वामी स्टेडियम और एमजी रोड में अभी सबसे ज्यादा किराए की राइड्स मिल रही हैं। आप माइक दबाकर हिंदी या English में कुछ भी पूछ सकते हैं!",
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
          Starting Uber Driver Partner Pro...
        </span>
      </div>
    );
  }

  const focusedZone = selectedZone ? state.zones[selectedZone] : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      <UberNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        modelHealth={state.modelHealth}
        onTriggerScenario={handleTriggerScenario}
        isProcessing={isProcessing}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4">
        {/* TAB 1: REAL DRIVER MAP & COPILOT */}
        {activeTab === "map" && (
          <div className="space-y-4">
            {/* Sleek Compact Driver HUD (Takes minimal vertical space) */}
            <DriverSectorSpotlight
              user={currentUser}
              profile={currentProfile}
              sectorTelemetry={sectorTelemetry}
              onFlyToMySector={handleFlyToMySector}
              onOpenTerritoryModal={() => setIsAuthModalOpen(true)}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left 7 Cols: Clean Leaflet Map */}
              <div className="lg:col-span-7 space-y-3">
                <RealLeafletMap
                  state={state}
                  selectedZone={selectedZone}
                  onSelectZone={setSelectedZone}
                  flyToCoords={mapFlyToCoords}
                />

                {/* Selected Hotspot Card (Clean, Simple Drawer) */}
                {focusedZone && (
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 shadow-lg backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
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
            {/* 4 Big KPI Metric Cards (Moved here to clean up the main map view) */}
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
                  <span className="text-xs font-bold text-cyan-400">6 Metros</span>
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
                  <span className="text-2xl font-black text-cyan-400">
                    {state.metrics.transitNetworkHealthPercent}%
                  </span>
                  <span className="text-xs font-bold text-cyan-300">Clear Flow</span>
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
      </main>

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
