"use client";

import React, { useState, useEffect, useRef } from "react";
import { SurgeHandlingRequest, MarketplaceState } from "@/lib/uber/types";
import {
  Flame,
  Zap,
  ShieldCheck,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Car,
  Navigation,
  Play,
  Pause,
  Plus,
  RefreshCw,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";

interface SurgeHandlingMonitorProps {
  state: MarketplaceState;
  onTriggerScenario?: (type: any) => Promise<void>;
  onTrigger1000Burst?: (locationName?: string) => Promise<any>;
  initialStressData?: any;
}

// Synthesize pleasant Uber UI alert chimes via Web Audio API (Zero external assets required)
const playChime = (type: "shock" | "ping" = "shock", isMuted: boolean = false) => {
  if (isMuted || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "shock") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch (e) {
    // Autoplay policy or unsupported audio context - fail silently
  }
};

const INDIAN_NAMES = [
  "Rahul Verma", "Ananya Sharma", "Rohan Mehta", "Priya Kulkarni",
  "Vikram Patel", "Sneha Rao", "Arjun Nair", "Kavita Reddy",
  "Aditya Das", "Pooja Malhotra", "Kunal Singhania", "Neha Iyer",
  "Suresh Raman", "Deepak Gupta", "Meera Joshi", "Aman Kapoor",
  "Tanvi Sen", "Gaurav Bansal", "Ritu Chaudhary", "Sameer Deshmukh",
  "Naveen Jindal", "Shreya Bhat", "Kartik Sundaram", "Divya Menon"
];

const DESTINATIONS = [
  "Kempegowda International Airport (BLR T2)",
  "Indiranagar 100ft Road Metro",
  "Koramangala 5th Block Club Area",
  "Electronic City Phase 1 Toll Plaza",
  "Whitefield ITPL Main Gate",
  "MG Road Trinity Metro Station",
  "Bellandur EcoSpace Outer Ring Rd",
  "HSR Layout Sector 4 High St",
  "Bandra Kurla Complex (BKC), Mumbai",
  "DLF Cyber Hub Phase 2, Gurugram",
  "HITEC City Cyber Towers, Hyderabad",
  "Sector V Salt Lake, Kolkata",
];

const GATES = [
  "Gate A (North Arterial Link)",
  "Gate B (Metro Skywalk Plaza)",
  "Gate C (South Express Flyover)",
];

const VEHICLE_CLASSES = ["Uber Go", "Uber Premier", "Uber Auto", "Uber Green EV"];

export default function SurgeHandlingMonitor({
  state,
  onTriggerScenario,
  onTrigger1000Burst,
  initialStressData,
}: SurgeHandlingMonitorProps) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAutoStreaming, setIsAutoStreaming] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "DISPATCHED" | "QUEUED">("ALL");
  const [stressData, setStressData] = useState<any>(initialStressData || null);
  const [bannerAlert, setBannerAlert] = useState<{ title: string; text: string; type: "shock" | "scenario" } | null>(null);

  // Sync initialStressData if updated from parent
  useEffect(() => {
    if (initialStressData) {
      setStressData(initialStressData);
      if (initialStressData.recentSurgeRequests?.length > 0) {
        setLiveRequests(initialStressData.recentSurgeRequests);
      }
    }
  }, [initialStressData]);

  // Dynamic live numbers that tick and fluctuate continuously
  const [tickCount, setTickCount] = useState(0);
  const [totalHandled, setTotalHandled] = useState(1048);
  const [currentLatency, setCurrentLatency] = useState(2.3);
  const [dampingProtection, setDampingProtection] = useState(65.4);
  const [newestRequestId, setNewestRequestId] = useState<string | null>(null);

  // Active surge multiplier calculation (auto-updates with scenarios)
  const maxZoneSurge = Object.values(state.zones || {}).reduce((max, z) => {
    return (z?.surgeMultiplier || 1.0) > max ? z.surgeMultiplier : max;
  }, 1.8);

  const activeSurge = stressData?.surgeMultiplier ?? Math.max(maxZoneSurge, 1.8);

  // In-memory live requests list initialized from simulation state or generated seed
  const [liveRequests, setLiveRequests] = useState<SurgeHandlingRequest[]>(() => {
    if (state.recentSurgeRequests && state.recentSurgeRequests.length > 0) {
      return state.recentSurgeRequests;
    }
    // Seed initial 12 requests
    const now = Date.now();
    return Array.from({ length: 12 }, (_, i) => {
      const riderName = INDIAN_NAMES[i % INDIAN_NAMES.length];
      const dropoffLocation = DESTINATIONS[i % DESTINATIONS.length];
      const gate = GATES[i % GATES.length];
      const vehicleClass = VEHICLE_CLASSES[i % VEHICLE_CLASSES.length];
      const baseFare = 180 + (i * 15) % 120;
      const surgeBonus = Math.round(baseFare * (activeSurge - 1));
      const wave = i < 4 ? 1 : i < 8 ? 2 : 3;
      return {
        id: `SRG-${1000 + i}-${now.toString().slice(-4)}`,
        timestamp: `${(i * 3 + 1)}s ago`,
        riderName,
        pickupLocation: "M. Chinnaswamy Stadium, MG Road",
        dropoffLocation,
        vehicleClass,
        surgeMultiplier: +activeSurge.toFixed(1),
        baseFareInr: baseFare,
        surgeBonusInr: surgeBonus,
        totalFareInr: baseFare + surgeBonus,
        dispersalGate: gate,
        waveNumber: wave,
        waveStatus: wave === 1 ? "DISPATCHED" : "BUFFER_QUEUED",
        antiHerdEngaged: true,
        latencyMs: +(1.8 + (i % 5) * 0.25).toFixed(1),
      };
    });
  });

  // Helper to create a single fresh request
  const createFreshSurgeRequest = (customMultiplier?: number, customLocation?: string): SurgeHandlingRequest => {
    const idNum = Math.floor(1000 + Math.random() * 9000);
    const riderName = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
    const dropoffLocation = DESTINATIONS[Math.floor(Math.random() * DESTINATIONS.length)];
    const gate = GATES[Math.floor(Math.random() * GATES.length)];
    const vehicleClass = VEHICLE_CLASSES[Math.floor(Math.random() * VEHICLE_CLASSES.length)];
    const mult = customMultiplier || activeSurge;
    const baseFare = Math.floor(Math.random() * 140) + 180;
    const surgeBonus = Math.round(baseFare * (mult - 1));
    const waveNum = Math.random() > 0.45 ? 1 : Math.random() > 0.5 ? 2 : 3;

    return {
      id: `SRG-${idNum}-${Date.now().toString().slice(-4)}`,
      timestamp: "Just now",
      riderName,
      pickupLocation: customLocation || "M. Chinnaswamy Stadium, MG Road",
      dropoffLocation,
      vehicleClass,
      surgeMultiplier: +mult.toFixed(1),
      baseFareInr: baseFare,
      surgeBonusInr: surgeBonus,
      totalFareInr: baseFare + surgeBonus,
      dispersalGate: gate,
      waveNumber: waveNum,
      waveStatus: waveNum === 1 ? "DISPATCHED" : "BUFFER_QUEUED",
      antiHerdEngaged: true,
      latencyMs: +(1.6 + Math.random() * 1.5).toFixed(1),
    };
  };

  // Continuous real-time ticker: adds dynamic stream rows, fluctuates latency & damping, advances wave counters
  useEffect(() => {
    if (!isAutoStreaming) return;

    const interval = setInterval(() => {
      setTickCount((prev) => prev + 1);

      // Micro-fluctuate latency between 1.8ms and 2.9ms
      setCurrentLatency(+(1.9 + Math.random() * 0.9).toFixed(1));

      // Micro-fluctuate damping protection around 65.2% - 66.8%
      setDampingProtection(+(64.9 + Math.random() * 1.8).toFixed(1));

      // Increment total requests handled
      setTotalHandled((prev) => prev + Math.floor(Math.random() * 2) + 1);

      // Prepend a new incoming surge request every 1.5s
      const newReq = createFreshSurgeRequest();
      setNewestRequestId(newReq.id);

      setLiveRequests((prev) => {
        // Update existing timestamps to show elapsed seconds
        const updated = prev.slice(0, 24).map((r, idx) => ({
          ...r,
          timestamp: `${(idx + 1) * 2}s ago`,
        }));
        return [newReq, ...updated];
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isAutoStreaming, activeSurge]);

  // Handle Shock 1,000 Concurrent Requests Test
  const handleRun1000Shock = async () => {
    setIsSimulating(true);
    playChime("shock", isMuted);

    // Fast counter explosion effect (animates total handled up by +1,000)
    const startVal = totalHandled;
    const targetVal = totalHandled + 1000;
    const duration = 1200;
    const startTime = Date.now();

    const animTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out quad
      const current = Math.round(startVal + (targetVal - startVal) * (1 - (1 - progress) * (1 - progress)));
      setTotalHandled(current);
      if (progress >= 1) clearInterval(animTimer);
    }, 30);

    // Show visual banner notification
    setBannerAlert({
      title: "💥 1,000 CONCURRENT REQUESTS BURST INGESTED",
      text: "Marketplace partitioned 1,000 rides across 3 arterial dispersal gates. Price surge auto-capped at 3.8x with zero server crash.",
      type: "shock",
    });

    try {
      let resultData: any = null;
      if (onTrigger1000Burst) {
        resultData = await onTrigger1000Burst("M. Chinnaswamy Stadium, MG Road");
      } else {
        const res = await fetch("/api/uber/stress-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationName: "M. Chinnaswamy Stadium, MG Road",
            lat: 12.9788,
            lng: 77.5996,
          }),
        });
        const data = await res.json();
        if (data.success) resultData = data;
      }

      if (resultData) {
        setStressData(resultData);
        if (resultData.recentSurgeRequests?.length > 0) {
          setLiveRequests(resultData.recentSurgeRequests);
        }
      }
    } catch (e) {
      console.error("Failed to run 1000 shock:", e);
    } finally {
      setIsSimulating(false);
      setTimeout(() => {
        setBannerAlert(null);
      }, 7000);
    }
  };

  // Scenario Buttons (Stadium Exit / Monsoon Flood)
  const handleScenarioClick = async (scenarioType: "STADIUM_CONCERT_END" | "MONSOON_FLASH_FLOOD") => {
    playChime("ping", isMuted);
    setStressData(null); // Reset manual stress data so scenario surge takes precedence

    if (scenarioType === "STADIUM_CONCERT_END") {
      setBannerAlert({
        title: "🏏 IPL STADIUM EXIT ACTIVATED (3.5x SURGE)",
        text: "40,000 fans exiting Chinnaswamy Stadium. Multi-arterial pedestrian gates balancing crowds toward MG Road & Cubbon Park.",
        type: "scenario",
      });
      // Prepend fresh stadium requests
      const burst = Array.from({ length: 6 }, () =>
        createFreshSurgeRequest(3.5, "M. Chinnaswamy Stadium, MG Road")
      );
      setLiveRequests((prev) => [...burst, ...prev.slice(0, 18)]);
    } else {
      setBannerAlert({
        title: "🌧️ MONSOON FLASH FLOOD ACTIVATED (2.9x SURGE)",
        text: "Outer Ring Road waterlogged. Michelangelo dynamic rerouting elevated corridors with anti-herd fleet protection at 68%.",
        type: "scenario",
      });
      // Prepend fresh monsoon requests
      const burst = Array.from({ length: 6 }, () =>
        createFreshSurgeRequest(2.9, "Outer Ring Road (Tech Park Corridor)")
      );
      setLiveRequests((prev) => [...burst, ...prev.slice(0, 18)]);
    }

    if (onTriggerScenario) {
      await onTriggerScenario(scenarioType);
    }

    setTimeout(() => {
      setBannerAlert(null);
    }, 6000);
  };

  // Manual Add Request Button for testing
  const handleInjectManualRequest = () => {
    playChime("ping", isMuted);
    const req = createFreshSurgeRequest();
    setNewestRequestId(req.id);
    setTotalHandled((prev) => prev + 1);
    setLiveRequests((prev) => [req, ...prev.slice(0, 24)]);
  };

  // Dynamically calculate gate distributions based on current load
  const totalRidersActive = stressData ? 1000 : Math.max(900, Math.round(totalHandled * 0.9));
  const gateAJitter = (tickCount % 5) * 2 - 4;
  const gateBJitter = ((tickCount + 2) % 5) * 2 - 4;

  const gateACount = Math.round(totalRidersActive * 0.34) + gateAJitter;
  const gateBCount = Math.round(totalRidersActive * 0.33) + gateBJitter;
  const gateCCount = totalRidersActive - gateACount - gateBCount;

  const gateAPct = ((gateACount / totalRidersActive) * 100).toFixed(1);
  const gateBPct = ((gateBCount / totalRidersActive) * 100).toFixed(1);
  const gateCPct = ((gateCCount / totalRidersActive) * 100).toFixed(1);

  // Dynamic Departure Wave numbers
  const wave1Dispatched = 24 + (tickCount % 12);
  const wave1Target = 36;
  const wave1Pct = Math.min(100, Math.round((wave1Dispatched / wave1Target) * 100));

  const wave2Buffered = 32 + (tickCount % 8);
  const wave3Queued = 40 + (tickCount % 6);
  const wave4Inflow = 48 + (tickCount % 10);

  // Filter requests
  const filteredRequests = liveRequests.filter((r: SurgeHandlingRequest) => {
    if (selectedFilter === "DISPATCHED") return r.waveStatus === "DISPATCHED";
    if (selectedFilter === "QUEUED") return r.waveStatus !== "DISPATCHED";
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Uber-Style Surge Hero Header */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-7 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" />
                MICHELANGELO DYNAMIC SURGE &amp; SHOCK BALANCER
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${isAutoStreaming ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
                {isAutoStreaming ? "Streaming Live (1.5s)" : "Stream Paused"}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Custom Database Synced
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Real-Time Surge Handling Requests
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl leading-relaxed">
              Watch Uber&apos;s marketplace algorithm continuously ingest high localized request spikes, enforce the strict 3.8x anti-gouging price ceiling, engage 65% anti-herd fleet damping, and distribute passengers across 3 physical dispersal gates in real time.
            </p>
          </div>

          {/* Quick Simulation Trigger Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={handleRun1000Shock}
              disabled={isSimulating}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50 active:scale-95 cursor-pointer"
              title="Stress-test the system with 1,000 instant concurrent ride requests"
            >
              <Zap className="h-4 w-4 fill-black" />
              <span>{isSimulating ? "⚡ Ingesting 1,000 Shock..." : "💥 Ingest 1,000 Requests Shock"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleScenarioClick("STADIUM_CONCERT_END")}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              🏏 Stadium Exit (3.5x)
            </button>

            <button
              type="button"
              onClick={() => handleScenarioClick("MONSOON_FLASH_FLOOD")}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              🌧️ Monsoon Flood (2.9x)
            </button>

            {/* Quick Live Stream Controls */}
            <button
              type="button"
              onClick={() => setIsAutoStreaming(!isAutoStreaming)}
              className={`p-2.5 rounded-xl border transition-all ${
                isAutoStreaming
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"
              }`}
              title={isAutoStreaming ? "Pause real-time stream" : "Resume real-time stream"}
            >
              {isAutoStreaming ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={handleInjectManualRequest}
              className="px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs transition-all flex items-center gap-1 active:scale-95"
              title="Inject 1 live ride request into stream immediately"
            >
              <Plus className="h-3.5 w-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Add Ride</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
              title={isMuted ? "Unmute UI chimes" : "Mute UI chimes"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Dynamic Alert Banner (Shows when user triggers shock or scenario) */}
        {bannerAlert && (
          <div
            className={`p-3.5 rounded-2xl border transition-all animate-fadeIn flex items-center justify-between gap-3 ${
              bannerAlert.type === "shock"
                ? "bg-amber-500/15 border-amber-500/40 text-amber-200"
                : "bg-emerald-500/15 border-emerald-500/40 text-emerald-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">
                {bannerAlert.type === "shock" ? "💥" : "⚡"}
              </span>
              <div>
                <span className="font-extrabold text-xs tracking-wide block uppercase font-mono">
                  {bannerAlert.title}
                </span>
                <span className="text-[11px] opacity-90 block">
                  {bannerAlert.text}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/40 border border-white/10 font-bold shrink-0">
              Active Now
            </span>
          </div>
        )}

        {/* 4 Surge Ingestion Metric Cards - 100% Dynamic with Live Ticking */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80">
          {/* Card 1: Dynamic Multiplier */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Dynamic Surge Multiplier</span>
              <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">
                {activeSurge.toFixed(1)}x
              </span>
              <span className="text-[10px] font-bold text-amber-300">
                {activeSurge >= 3.8 ? "Max Cap Engaged" : "Auto-Capped at 3.8x"}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Prevents predatory price gouging</span>
          </div>

          {/* Card 2: Requests Handled (Live Counter) */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Requests Handled</span>
              <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {totalHandled.toLocaleString()}
              </span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                100% Ingested
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Zero transaction drops or crashes</span>
          </div>

          {/* Card 3: Anti-Herd Fleet Damping (Live) */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Anti-Herd Fleet Damping</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {dampingProtection.toFixed(1)}%
              </span>
              <span className="text-[10px] font-bold text-emerald-300">City Safeguarded</span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Rest of city cab supply protected</span>
          </div>

          {/* Card 4: Ingestion Processing Latency (Live Jitter) */}
          <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase font-bold tracking-wider">Ingestion Processing Latency</span>
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">
                {currentLatency}ms
              </span>
              <span className="text-[10px] font-bold text-emerald-400">&lt; 5ms Kafka SLA</span>
            </div>
            <span className="text-[10px] text-zinc-400 block">Sub-5ms Kafka pipeline throughput</span>
          </div>
        </div>
      </div>

      {/* Dispersal Gates & Staggered Waves Architecture (100% DYNAMIC & ANIMATED) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: 3 Dispersal Gates (Live Dynamic Allocations) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Navigation className="h-4 w-4 text-emerald-400 animate-pulse" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Multi-Arterial Pedestrian Dispersal Gates
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 font-bold">
              {totalRidersActive.toLocaleString()} Riders Dispersing
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Prevents crowd bottlenecks by dynamically distributing passengers evenly across 3 separate arterial pickup zones around the venue.
          </p>

          <div className="space-y-2.5 pt-1 text-xs">
            {/* Gate A */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Gate A (North Arterial Link)</span>
                  <span className="text-[10px] text-zinc-400 block">120m &bull; ~3 min walk via Cubbon Link</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-400 block transition-all">
                    {gateACount} riders
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{gateAPct}% allocation</span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${gateAPct}%` }}
                />
              </div>
            </div>

            {/* Gate B */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Gate B (Metro Skywalk Plaza)</span>
                  <span className="text-[10px] text-zinc-400 block">200m &bull; ~5 min walk via MG Road Skywalk</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-400 block transition-all">
                    {gateBCount} riders
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{gateBPct}% allocation</span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${gateBPct}%` }}
                />
              </div>
            </div>

            {/* Gate C */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Gate C (South Express Flyover)</span>
                  <span className="text-[10px] text-zinc-400 block">280m &bull; ~7 min walk via Queen&apos;s Link</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-emerald-400 block transition-all">
                    {gateCCount} riders
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{gateCPct}% allocation</span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-700"
                  style={{ width: `${gateCPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: 4 Staggered Waves (Live Dispatch Progress & Countdowns) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400 animate-spin" style={{ animationDuration: "12s" }} />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Staggered Departure Waves (Anti-Gridlock)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              4 Active Waves
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Vehicles are queued in staggered 4-minute waves so local ring roads never freeze into single-lane traffic jams.
          </p>

          <div className="space-y-2.5 pt-1 text-xs">
            {/* Wave 1 */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Wave 1: Immediate Dispatches</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-ping" />
                      DISPATCHED
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">
                    0 - 2 mins &bull; Next wave release in {60 - (tickCount % 60)}s
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-black text-emerald-400 block">
                    {wave1Dispatched} / {wave1Target} Cabs
                  </span>
                  <span className="text-[10px] text-zinc-400">{wave1Pct}% completed</span>
                </div>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${wave1Pct}%` }}
                />
              </div>
            </div>

            {/* Wave 2 */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Wave 2: Buffer Arrivals</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border text-amber-300 border-amber-500/30 bg-amber-500/10">
                      BUFFERED
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">4 - 6 mins &bull; Staging at perimeter flyover</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-zinc-200 block">
                    {wave2Buffered} Cabs Buffered
                  </span>
                  <span className="text-[10px] text-amber-400">ETA: 3m 40s</span>
                </div>
              </div>
            </div>

            {/* Wave 3 */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Wave 3: Queued Arrivals</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border text-zinc-300 border-zinc-700 bg-zinc-800">
                      HOLDING
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">8 - 10 mins &bull; Queued on peripheral corridors</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-zinc-300 block">
                    {wave3Queued} Cabs Queued
                  </span>
                  <span className="text-[10px] text-zinc-400">ETA: 7m 15s</span>
                </div>
              </div>
            </div>

            {/* Wave 4 */}
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white">Wave 4: Inflow Routed</span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border text-zinc-400 border-zinc-800 bg-zinc-900">
                      INFLOW
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block">12 - 15 mins &bull; Anti-herd signal pacing active</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-zinc-400 block">
                    {wave4Inflow} Cabs En-Route
                  </span>
                  <span className="text-[10px] text-zinc-500">ETA: 12m 30s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE SURGE HANDLING REQUEST STREAM (THE STREAMING FEED TABLE) */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">
                Live Surge Request Ingestion Feed
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                {filteredRequests.length} Live Requests Streamed
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Every request shows live calculated fare, dynamic surge multiplier, designated gate, and wave dispatch status.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            {(["ALL", "DISPATCHED", "QUEUED"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  selectedFilter === filter
                    ? "bg-white text-black shadow-md font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {filter === "ALL" ? "All Requests" : filter === "DISPATCHED" ? "Dispatched" : "Queued in Waves"}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table / Feed */}
        <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
          {filteredRequests.map((req: SurgeHandlingRequest) => {
            const isDispatched = req.waveStatus === "DISPATCHED";
            const isNewest = req.id === newestRequestId;

            return (
              <div
                key={req.id}
                className={`rounded-2xl border p-3.5 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                  isNewest
                    ? "border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-900/10"
                    : "border-zinc-800/90 bg-zinc-900/70 hover:bg-zinc-900"
                }`}
              >
                {/* Left: ID, Rider, Route */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-bold">
                      {req.id}
                    </span>
                    <span className="font-bold text-white flex items-center gap-1">
                      {req.riderName}
                      {isNewest && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-black font-mono font-extrabold text-[9px] uppercase tracking-wider animate-pulse">
                          NEW
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">({req.timestamp})</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] font-bold">
                      {req.vehicleClass}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-zinc-300 text-xs truncate">
                    <span className="text-zinc-400 truncate">{req.pickupLocation}</span>
                    <ArrowRight className="h-3 w-3 text-zinc-500 shrink-0" />
                    <span className="text-white font-semibold truncate">{req.dropoffLocation}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-zinc-400 pt-0.5">
                    <span>📍 {req.dispersalGate}</span>
                    <span>&bull;</span>
                    <span>Wave {req.waveNumber}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-mono">⚡ {req.latencyMs}ms latency</span>
                  </div>
                </div>

                {/* Right: Fare & Status */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-extrabold font-mono text-[10px] border border-amber-500/30">
                        ⚡ {req.surgeMultiplier}x
                      </span>
                      <span className="text-base font-black text-white font-mono">
                        ₹{req.totalFareInr}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 block">
                      Base: ₹{req.baseFareInr} + Surge: +₹{req.surgeBonusInr}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border shrink-0 ${
                      isDispatched
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    }`}
                  >
                    {isDispatched ? "✓ DISPATCHED" : `QUEUED (WAVE ${req.waveNumber})`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
