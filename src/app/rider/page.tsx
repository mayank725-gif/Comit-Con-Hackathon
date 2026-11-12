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
    <div className="min-h-screen bg-[#fafaf6] text-[#193c34] flex flex-col font-sans selection:bg-[#ecf1e8]">
      {/* Standalone Rider Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e2e6de] bg-white/85 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          {/* Brand Logo & Mode Indicator */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#193c34] group-hover:text-[#f87746] transition-colors">
                Uber
              </span>
              <span className="rounded-full bg-[#ecf1e8] text-[#193c34] px-2.5 py-0.5 text-[11px] font-bold tracking-wide">
                Rider
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ecf1e8] border border-[#d2dcd5] text-[11px] text-[#193c34] font-medium">
              <span className="h-2 w-2 rounded-full bg-[#193c34] animate-pulse" />
              <span>Live Passenger Console</span>
            </div>
          </div>

          {/* User Profile & Quick Switch to Driver Portal */}
          <div className="flex items-center gap-2.5">
            {riderUser && (
              <button
                type="button"
                onClick={() => setIsRiderAuthOpen(true)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e2e6de] bg-white hover:border-[#193c34] text-xs transition-all safar-card-shadow text-[#193c34]"
                title="Click to view or switch rider profile"
              >
                <img
                  src={riderUser.avatar}
                  alt={riderUser.name}
                  className="w-5 h-5 rounded-full object-cover border border-[#193c34]/20"
                />
                <span className="font-bold text-[#193c34] hidden md:inline">{riderUser.name}</span>
                <span className="text-[11px] text-[#6b7a74]">★ {riderUser.rating}</span>
              </button>
            )}

            <Link
              href="/driver"
              className="px-4 py-1.5 rounded-full border border-[#e2e6de] bg-white hover:bg-[#ecf1e8] text-[#193c34] font-semibold text-xs transition-all flex items-center gap-2 shrink-0 safar-card-shadow"
              title="Open Driver Portal on Phone 2 or switch view"
            >
              <Car className="h-3.5 w-3.5 text-[#f87746]" />
              <span className="hidden sm:inline">Driver Partner</span>
              <span className="sm:hidden">Driver</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#6b7a74]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Rider Booking View */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 lg:px-8 py-6">
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
          <div className="w-full h-96 rounded-[28px] border border-[#e2e6de] bg-white safar-card-shadow flex flex-col items-center justify-center space-y-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#193c34] border-t-transparent animate-spin" />
            <span className="text-xs text-[#6b7a74]">Connecting to Live Marketplace...</span>
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
