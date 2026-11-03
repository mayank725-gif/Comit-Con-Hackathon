"use client";

import React, { useState } from "react";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import {
  signInWithRealGoogleFirebase,
  saveDriverProfileToCustomDb,
} from "@/lib/firebase/authService";
import {
  X,
  Sparkles,
  MapPin,
  Car,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Lock,
  Database,
} from "lucide-react";

interface DriverAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: DriverUser | null;
  currentProfile: DriverWorkProfile | null;
  onAuthSuccess: (user: DriverUser, profile: DriverWorkProfile) => void;
  onLogout: () => void;
}

const METRO_ZONES = {
  BENGALURU: [
    { id: "STADIUM", name: "M. Chinnaswamy Stadium & MG Road CBD", demand: "High (Surge 3.5x)", speed: "28 km/h" },
    { id: "TECH_PARK", name: "Bellandur Outer Ring Road Tech Corridor", demand: "Peak (Surge 2.8x)", speed: "35 km/h" },
    { id: "AIRPORT", name: "Kempegowda International Airport (BLR)", demand: "Steady (Surge 2.2x)", speed: "58 km/h" },
    { id: "DOWNTOWN", name: "Koramangala 80ft Road & Indiranagar", demand: "High (Surge 2.0x)", speed: "30 km/h" },
  ],
  DELHI: [
    { id: "DELHI_CENTRAL", name: "JLN Stadium, Connaught Place & Lodhi", demand: "Peak (Surge 3.2x)", speed: "32 km/h" },
    { id: "DELHI_CYBER", name: "DLF Cyber City & Golf Course Road (Gurgaon)", demand: "High (Surge 2.9x)", speed: "42 km/h" },
    { id: "DELHI_AIRPORT", name: "Indira Gandhi International Airport (DEL T3)", demand: "Steady (Surge 2.4x)", speed: "55 km/h" },
  ],
  MUMBAI: [
    { id: "MUMBAI_BKC", name: "Bandra Kurla Complex (BKC) & Jio World", demand: "Peak (Surge 3.6x)", speed: "24 km/h" },
    { id: "MUMBAI_SOUTH", name: "Nariman Point & Colaba Financial Hub", demand: "High (Surge 2.5x)", speed: "30 km/h" },
    { id: "MUMBAI_AIRPORT", name: "Chhatrapati Shivaji Maharaj Airport (BOM)", demand: "High (Surge 2.5x)", speed: "45 km/h" },
  ],
  HYDERABAD: [
    { id: "HYDERABAD_HITEC", name: "HITEC City & Madhapur Cyber Towers", demand: "High (Surge 2.7x)", speed: "38 km/h" },
  ],
  CHENNAI: [
    { id: "CHENNAI_OMR", name: "Old Mahabalipuram Road (OMR IT Expressway)", demand: "High (Surge 2.3x)", speed: "40 km/h" },
  ],
  KOLKATA: [
    { id: "KOLKATA_SALTLAKE", name: "Salt Lake Sector 5 & New Town EcoSpace", demand: "High (Surge 2.2x)", speed: "36 km/h" },
  ],
};

export default function DriverAuthModal({
  isOpen,
  onClose,
  currentUser,
  currentProfile,
  onAuthSuccess,
  onLogout,
}: DriverAuthModalProps) {
  const [step, setStep] = useState<"LOGIN" | "TERRITORY">("LOGIN");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Onboarding Form State
  const [city, setCity] = useState<"DELHI" | "BENGALURU" | "MUMBAI" | "HYDERABAD" | "CHENNAI" | "KOLKATA">(
    currentProfile?.city || "BENGALURU"
  );
  const [primaryZone, setPrimaryZone] = useState(currentProfile?.primaryZone || "STADIUM");
  const [vehicleType, setVehicleType] = useState<"UBER_GO" | "UBER_PREMIER" | "UBER_AUTO" | "UBER_GREEN_EV">(
    currentProfile?.vehicleType || "UBER_GO"
  );
  const [licensePlate, setLicensePlate] = useState(currentProfile?.licensePlate || "KA 01 UB 8088");
  const [vehicleModel, setVehicleModel] = useState(currentProfile?.vehicleModel || "Maruti Suzuki Dzire");
  const [dailyEarningsTarget, setDailyEarningsTarget] = useState(currentProfile?.dailyEarningsTarget || 3000);
  const [willingOutstation, setWillingOutstation] = useState(currentProfile?.willingOutstation ?? true);

  if (!isOpen) return null;

  // Real Google Sign-In (Identity via Google, database is 100% our own)
  const handleRealGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);

    const result = await signInWithRealGoogleFirebase();

    if (result.success && result.user && result.profile) {
      onAuthSuccess(result.user, result.profile);
      setStep("TERRITORY");
    } else {
      setAuthError(result.error || "Authentication failed. Please try again.");
    }
    setIsLoading(false);
  };

  // Save Territory directly to our OWN database
  const handleSaveTerritory = async () => {
    if (!currentUser) return;
    setIsLoading(true);

    const zonesList = METRO_ZONES[city] || [];
    const matchedZone = zonesList.find((z) => z.id === primaryZone);
    const primaryZoneName = matchedZone?.name || primaryZone;

    const cityNames: Record<string, string> = {
      BENGALURU: "Bengaluru",
      DELHI: "Delhi NCR",
      MUMBAI: "Mumbai",
      HYDERABAD: "Hyderabad",
      CHENNAI: "Chennai",
      KOLKATA: "Kolkata",
    };

    const profileData = {
      userId: currentUser.id,
      city,
      cityName: cityNames[city] || city,
      primaryZone,
      primaryZoneName,
      vehicleType,
      vehicleModel,
      licensePlate: licensePlate.toUpperCase(),
      dailyEarningsTarget: Number(dailyEarningsTarget),
      willingOutstation,
      driverName: currentUser.name,
    };

    try {
      // Save directly into our OWN database
      const res = await saveDriverProfileToCustomDb(profileData);

      if (res.success && res.profile) {
        onAuthSuccess(currentUser, res.profile);
        onClose();
      } else {
        setAuthError(res.error || "Failed to update territory in custom database");
      }
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setAuthError(err?.message || "Failed to save profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl border border-zinc-700 bg-zinc-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold flex items-center gap-1">
                <Database className="h-3 w-3" />
                GOOGLE AUTHENTICATION &bull; CUSTOM DATABASE
              </span>
              <span className="text-zinc-500 text-xs font-mono">
                {step === "LOGIN" ? "Step 1 of 2: Sign-in" : "Step 2 of 2: Work Area"}
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {step === "LOGIN"
                ? "Driver Google Sign-In"
                : "Select Your Operating Work Area"}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: REAL GOOGLE SIGN-IN */}
        {step === "LOGIN" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 space-y-4 shadow-xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center text-white">
                <Lock className="h-6 w-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">
                  Official Google Account Sign-In
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                  Sign in with your Google account. Your driver work territory, shift pacing, and vehicle profile are stored securely in your own custom database.
                </p>
              </div>

              {/* Official Google Sign-In Button */}
              <button
                type="button"
                onClick={handleRealGoogleLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50"
              >
                {/* Official Google 4-Color SVG Icon */}
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
              </button>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs text-left">
                  <span className="font-bold block mb-0.5">Authentication Notice:</span>
                  <span>{authError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1 font-mono">
              <span>● Self-Hosted Driver Database</span>
              <span>🔒 256-bit TLS Encrypted</span>
            </div>
          </div>
        )}

        {/* STEP 2: WORK AREA & OPERATING TERRITORY CONFIGURATION */}
        {step === "TERRITORY" && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                Operating sector and vehicle details are saved directly into your custom driver database.
              </span>
            </div>

            {/* City Selection */}
            <div>
              <label className="text-xs font-bold text-white block mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-zinc-400" />
                <span>Primary Metro City</span>
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {(["DELHI", "BENGALURU", "MUMBAI", "HYDERABAD", "CHENNAI", "KOLKATA"] as const).map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setCity(c);
                        const defaultZone = METRO_ZONES[c]?.[0]?.id || "STADIUM";
                        setPrimaryZone(defaultZone);
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        city === c
                          ? "bg-white text-black border-white shadow-md font-extrabold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                      }`}
                    >
                      {c.substring(0, 3)}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Sector Dropdown */}
            <div>
              <label className="text-xs font-bold text-white block mb-1.5 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-amber-400" />
                <span>Assigned High-Yield Operating Sector</span>
              </label>
              <select
                value={primaryZone}
                onChange={(e) => setPrimaryZone(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
              >
                {(METRO_ZONES[city] || []).map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} &bull; {z.demand} &bull; {z.speed}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle & Plate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white block mb-1 flex items-center gap-1">
                  <Car className="h-3.5 w-3.5 text-zinc-400" />
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. Maruti Dzire VXI"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-white block mb-1">
                  Commercial Plate Number
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="KA 01 UB 8088"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-white"
                />
              </div>
            </div>

            {/* Earnings Target */}
            <div>
              <label className="text-xs font-bold text-white block mb-1 flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Daily Shift Income Target (₹ INR)
              </label>
              <input
                type="number"
                value={dailyEarningsTarget}
                onChange={(e) => setDailyEarningsTarget(Number(e.target.value))}
                min={1000}
                max={15000}
                step={500}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white font-mono"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setStep("LOGIN")}
                className="text-xs text-zinc-400 hover:text-white"
              >
                &larr; Back
              </button>

              <button
                type="button"
                onClick={handleSaveTerritory}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Work Area &amp; Go Online</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
