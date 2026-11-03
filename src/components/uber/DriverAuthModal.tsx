"use client";

import React, { useState, useEffect } from "react";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
import {
  signInWithRealGoogleFirebase,
  saveDriverProfileToFirestore,
} from "@/lib/firebase/authService";
import { isFirebaseConfigured, firebaseConfig } from "@/lib/firebase/config";
import {
  X,
  Sparkles,
  MapPin,
  Car,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  LogOut,
  Building2,
  Navigation,
  KeyRound,
  Database,
  Lock,
  ChevronDown,
  ChevronUp,
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

const SEED_ACCOUNTS = [
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@uber-driver.in",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    city: "MUMBAI" as const,
    zone: "MUMBAI_BKC",
    plate: "MH 02 CB 9912",
    car: "Hyundai Xcent Prime",
    category: "UBER_GO" as const,
  },
  {
    name: "Ramesh Gowda",
    email: "ramesh.gowda@uber-driver.in",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
    city: "BENGALURU" as const,
    zone: "STADIUM",
    plate: "KA 01 UB 8088",
    car: "Maruti Suzuki Dzire",
    category: "UBER_GO" as const,
  },
  {
    name: "Amit Sharma",
    email: "amit.sharma@uber-driver.in",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    city: "DELHI" as const,
    zone: "DELHI_CENTRAL",
    plate: "DL 1T CAB 5521",
    car: "Maruti Ertiga ZXI",
    category: "UBER_PREMIER" as const,
  },
];

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
  const [showFirebaseConfig, setShowFirebaseConfig] = useState(false);

  // Firebase Config Form State
  const [fbApiKey, setFbApiKey] = useState(firebaseConfig.apiKey || "");
  const [fbProjectId, setFbProjectId] = useState(firebaseConfig.projectId || "");
  const [fbAuthDomain, setFbAuthDomain] = useState(firebaseConfig.authDomain || "");
  const [fbAppId, setFbAppId] = useState(firebaseConfig.appId || "");
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  // Custom fallback email
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");

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

  // Real Google Sign-In via Firebase
  const handleRealFirebaseGoogleLogin = async () => {
    setIsLoading(true);
    setAuthError(null);

    const result = await signInWithRealGoogleFirebase();

    if (result.success && result.user && result.profile) {
      onAuthSuccess(result.user, result.profile);
      setStep("TERRITORY");
    } else {
      setAuthError(result.error || "Firebase authentication failed");
      // If keys are missing, expand config section
      if (!isFirebaseConfigured) {
        setShowFirebaseConfig(true);
      }
    }
    setIsLoading(false);
  };

  // Save Firebase keys directly
  const handleSaveFirebaseKeys = async () => {
    if (!fbApiKey || !fbProjectId) {
      alert("Please provide both API Key and Project ID");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/firebase-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: fbApiKey,
          projectId: fbProjectId,
          authDomain: fbAuthDomain || `${fbProjectId}.firebaseapp.com`,
          appId: fbAppId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setConfigSuccessMsg("✓ Firebase API keys saved! Reloading configuration...");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setAuthError(data.error || "Failed to save configuration");
      }
    } catch (e: any) {
      setAuthError(e?.message || "Error saving Firebase keys");
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback direct login handler
  const handleDirectLogin = async (acc: {
    email: string;
    name: string;
    avatar?: string;
    city?: "DELHI" | "BENGALURU" | "MUMBAI" | "HYDERABAD" | "CHENNAI" | "KOLKATA";
    zone?: string;
    plate?: string;
    car?: string;
  }) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleId: `google-oauth2|${Date.now()}`,
          email: acc.email,
          name: acc.name,
          avatar: acc.avatar,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (acc.city) setCity(acc.city);
        if (acc.zone) setPrimaryZone(acc.zone);
        if (acc.plate) setLicensePlate(acc.plate);
        if (acc.car) setVehicleModel(acc.car);

        setStep("TERRITORY");
        onAuthSuccess(data.user, data.profile);
      }
    } catch (err) {
      console.error("Auth error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Save Territory to Firestore and Backend
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
      // 1. Save directly into Cloud Firestore
      await saveDriverProfileToFirestore(currentUser.id, profileData);

      // 2. Save into server session
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      const data = await res.json();
      if (data.success && data.profile) {
        onAuthSuccess(currentUser, data.profile);
        onClose();
      }
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-500/30 bg-zinc-950 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header with Close */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold flex items-center gap-1">
                <Database className="h-3 w-3" />
                REAL FIREBASE &amp; FIRESTORE AUTH
              </span>
              <span className="text-zinc-500 text-xs font-mono">
                {step === "LOGIN" ? "Step 1 of 2: Sign-in" : "Step 2 of 2: Operating Area"}
              </span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {step === "LOGIN"
                ? "Real Google Driver Authentication"
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

        {/* STEP 1: REAL GOOGLE FIREBASE SIGN-IN */}
        {step === "LOGIN" && (
          <div className="space-y-5">
            {/* Real Firebase Google Sign-In Primary Button */}
            <div className="rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-zinc-900 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-indigo-400" />
                  Official Google OAuth via Firebase SDK
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isFirebaseConfigured
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {isFirebaseConfigured ? "● Firebase Ready" : "API Key Pending"}
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Connect directly using real Google credentials. Profile and work territory will be synchronized in real time with Cloud Firestore.
              </p>

              <button
                type="button"
                onClick={handleRealFirebaseGoogleLogin}
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-black font-extrabold text-sm flex items-center justify-center gap-3 shadow-lg hover:shadow-white/20 transition-all disabled:opacity-50"
              >
                {/* Official Google Color SVG */}
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
                <span>{isLoading ? "Signing in..." : "Sign in with Google (Firebase)"}</span>
              </button>

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <span className="font-bold">Notice:</span>
                  <span>{authError}</span>
                </div>
              )}
            </div>

            {/* Firebase API Keys Configuration Section */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
              <button
                type="button"
                onClick={() => setShowFirebaseConfig(!showFirebaseConfig)}
                className="w-full flex items-center justify-between text-left text-xs font-bold text-zinc-300 hover:text-white transition-colors"
              >
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  <span>Configure Firebase &amp; Firestore API Keys</span>
                </div>
                {showFirebaseConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showFirebaseConfig && (
                <div className="space-y-3 pt-2 border-t border-zinc-800 text-xs animate-fadeIn">
                  <p className="text-[11px] text-zinc-400">
                    Paste your Firebase project credentials here to connect real Google Authentication and Cloud Firestore database:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">
                        API Key (apiKey)
                      </label>
                      <input
                        type="text"
                        value={fbApiKey}
                        onChange={(e) => setFbApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">
                        Project ID (projectId)
                      </label>
                      <input
                        type="text"
                        value={fbProjectId}
                        onChange={(e) => setFbProjectId(e.target.value)}
                        placeholder="uber-driver-prod"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">
                        Auth Domain (authDomain)
                      </label>
                      <input
                        type="text"
                        value={fbAuthDomain}
                        onChange={(e) => setFbAuthDomain(e.target.value)}
                        placeholder="your-project.firebaseapp.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">
                        App ID (appId)
                      </label>
                      <input
                        type="text"
                        value={fbAppId}
                        onChange={(e) => setFbAppId(e.target.value)}
                        placeholder="1:123456789:web:abcdef..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveFirebaseKeys}
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Firebase &amp; Firestore Keys</span>
                  </button>

                  {configSuccessMsg && (
                    <p className="text-xs text-emerald-400 font-bold text-center">
                      {configSuccessMsg}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* One-Click Driver Accounts */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                Or Quick-Test with Verified Drivers:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SEED_ACCOUNTS.map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleDirectLogin(acc)}
                    disabled={isLoading}
                    className="flex flex-col items-center text-center p-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 hover:border-cyan-400 hover:bg-zinc-850 transition-all text-xs group"
                  >
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-10 h-10 rounded-full object-cover border-2 border-cyan-400 mb-2 group-hover:scale-105 transition-transform"
                    />
                    <strong className="text-white text-xs block">{acc.name}</strong>
                    <span className="text-[10px] text-zinc-400 truncate w-full">{acc.email}</span>
                    <span className="mt-1 px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 text-[9px] font-mono">
                      {acc.city} &bull; {acc.plate}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: WORK AREA & OPERATING TERRITORY CONFIGURATION */}
        {step === "TERRITORY" && (
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                Work territory changes automatically sync with Cloud Firestore and personalize your driver copilot telemetry.
              </span>
            </div>

            {/* City Selection */}
            <div>
              <label className="text-xs font-bold text-white block mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-cyan-400" />
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
                          ? "bg-cyan-500 text-black border-cyan-400 shadow-md font-extrabold"
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                  <Car className="h-3.5 w-3.5 text-cyan-400" />
                  Vehicle Model
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. Maruti Dzire VXI"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
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
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save to Cloud Firestore &amp; Go Online</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
