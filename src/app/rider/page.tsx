"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import CustomerPortalView from "@/components/uber/CustomerPortalView";
import RiderAuthModal, { RiderUser } from "@/components/uber/RiderAuthModal";
import { MarketplaceState, RideRequest } from "@/lib/uber/types";
import { ArrowRight, Smartphone, Car, ShieldCheck, User } from "lucide-react";
import { publishRideToFirestore } from "@/lib/firebase/firestoreRides";

export default function RiderPage() {
  const [state, setState] = useState<MarketplaceState | null>(null);
  const [riderUser, setRiderUser] = useState<RiderUser | null>(null);
  const [isRiderAuthOpen, setIsRiderAuthOpen] = useState(false);

  // Initial load: fetch state & check mandatory Rider session
  useEffect(() => {
    fetchState();

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("uber_rider_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setRiderUser(parsed);
        } catch (e) {
          setIsRiderAuthOpen(true);
        }
      } else {
        // Enforce mandatory login on entry
        setIsRiderAuthOpen(true);
      }
    }
  }, []);

  // Live simulation ticker for real-time demand & surge stream
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
        console.error("Rider tick error:", e);
      } finally {
        isTicking = false;
      }
    }, 1500);

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

  const handleRequestRide = async (request: RideRequest) => {
    // Attach logged in rider identity to the ride payload
    const enrichedRequest: RideRequest = {
      ...request,
      riderName: riderUser?.name || request.riderName || "Aman Gupta",
      riderRating: riderUser?.rating || request.riderRating || 4.95,
      timestamp: new Date().toISOString(),
    };

    // Publish directly to Cloud Firestore for instant sub-30ms WebSocket dispatch
    publishRideToFirestore(enrichedRequest).catch(() => {});

    try {
      await fetch("/api/uber/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedRequest),
      });
    } catch (e) {
      console.error("Failed to persist ride to custom database:", e);
    }
  };

  const handleTriggerScenario = async (scenario: string) => {
    try {
      const res = await fetch("/api/uber/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (e) {
      console.error("Scenario trigger failed:", e);
    }
  };

  const handleLogoutRider = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("uber_rider_user");
    }
    setRiderUser(null);
    setIsRiderAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-800">
      {/* Standalone Rider Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-black/95 backdrop-blur-xl px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Brand Logo & Mode Indicator */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl sm:text-2xl font-black tracking-tighter text-white">
                Uber
              </span>
              <span className="rounded-md bg-white text-black px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                Rider
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400 font-bold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>📱 Phone 1 Mode &bull; Live Two-Way Synced</span>
            </div>
          </div>

          {/* User Profile & Quick Switch to Driver Portal */}
          <div className="flex items-center gap-2">
            {riderUser && (
              <button
                type="button"
                onClick={() => setIsRiderAuthOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs transition-all"
                title="Click to view or switch rider profile"
              >
                <img
                  src={riderUser.avatar}
                  alt={riderUser.name}
                  className="w-5 h-5 rounded-full object-cover border border-emerald-400"
                />
                <span className="font-bold text-white hidden md:inline">{riderUser.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">★ {riderUser.rating}</span>
              </button>
            )}

            <div className="sm:hidden flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Rider Phone</span>
            </div>

            <Link
              href="/driver"
              className="px-3.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-all flex items-center gap-1.5 shrink-0"
              title="Open Driver Portal on Phone 2 or switch view"
            >
              <Car className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Open Driver Portal (Phone 2)</span>
              <span className="sm:hidden">Driver App</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Rider Booking View */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {state ? (
          <CustomerPortalView
            state={state}
            onBookRide={handleRequestRide}
            onSwitchToDriver={() => {
              window.location.href = "/driver";
            }}
            onTriggerScenario={handleTriggerScenario}
            riderUser={riderUser}
            onOpenRiderAuth={() => setIsRiderAuthOpen(true)}
            onLogoutRider={handleLogoutRider}
          />
        ) : (
          <div className="w-full h-96 rounded-3xl border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-zinc-400">Loading Rider Portal &amp; Live Marketplace...</span>
          </div>
        )}
      </main>

      {/* Mandatory Rider Authentication Modal */}
      <RiderAuthModal
        isOpen={isRiderAuthOpen}
        onClose={() => setIsRiderAuthOpen(false)}
        currentRider={riderUser}
        onAuthSuccess={(rider) => {
          setRiderUser(rider);
          setIsRiderAuthOpen(false);
        }}
        canClose={Boolean(riderUser)}
      />
    </div>
  );
}
