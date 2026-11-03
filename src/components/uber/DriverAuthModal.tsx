"use client";

import React, { useState } from "react";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";
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

  const handleGoogleLogin = async (acc: {
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

        // Move to step 2 to confirm/customize their work area
        setStep("TERRITORY");
        onAuthSuccess(data.user, data.profile);
      }
    } catch (err) {
      console.error("Google Auth error:", err);
    } finally {
      setIsLoading(false);
    }
  };

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

    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
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
      <div className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-[#0d1117] p-6 shadow-2xl relative text-white space-y-5">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#00d2ff] to-[#9d4edd] shadow-lg shadow-cyan-500/20">
            <KeyRound className="h-5 w-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                MICHELANGELO DRIVER PORTAL
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                ENTERPRISE DB &bull; SELF-HOSTED
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight">
              {step === "LOGIN"
                ? "Driver Authentication via Google"
                : "Configure Your Operating Work Area"}
            </h2>
          </div>
        </div>

        {/* STEP 1: GOOGLE SIGN-IN */}
        {step === "LOGIN" && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300 leading-relaxed">
              Sign in with your Google account to access your personalized territory telemetry, live surge alerts, and the Michelangelo Multi-Agent driver copilot.
            </p>

            {/* Quick 1-Click Verified Google Accounts */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold">
                Choose a Driver Profile to Sign In Instantly:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {SEED_ACCOUNTS.map((acc, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGoogleLogin(acc)}
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

            {/* Divider */}
            <div className="flex items-center gap-3">
              <span className="h-[1px] flex-1 bg-zinc-800" />
              <span className="text-[10px] text-zinc-500 uppercase font-mono">Or Use Custom Google Account</span>
              <span className="h-[1px] flex-1 bg-zinc-800" />
            </div>

            {/* Custom Google Email Input Form */}
            <div className="space-y-2.5 bg-zinc-950/70 rounded-2xl border border-zinc-800 p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Vikramaditya Singh"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                    Google Email
                  </label>
                  <input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="driver.name@gmail.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Official Google Styled Button */}
              <button
                type="button"
                onClick={() => {
                  if (!customEmail) {
                    alert("Please enter a Google email to sign in");
                    return;
                  }
                  handleGoogleLogin({
                    email: customEmail,
                    name: customName || customEmail.split("@")[0],
                  });
                }}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all disabled:opacity-50"
              >
                {/* Google Multi-Color SVG */}
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                <span>Sign in with Google Account</span>
              </button>
            </div>

            {/* Current user logged in state */}
            {currentUser && (
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="" />
                  <span className="text-zinc-300">Logged in as {currentUser.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStep("TERRITORY")}
                    className="text-cyan-400 font-bold hover:underline"
                  >
                    Change Work Area &rarr;
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CONFIGURE WORK AREA & OPERATING SECTOR */}
        {step === "TERRITORY" && (
          <div className="space-y-4">
            <p className="text-xs text-zinc-300">
              Select your primary operating city, sector, vehicle, and shift goals. The Michelangelo real-time engine will personalize your live demand radar, route optimization, and driver assistant to this territory.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* City Selector */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  1. Operating City / Metro
                </label>
                <select
                  value={city}
                  onChange={(e) => {
                    const newCity = e.target.value as any;
                    setCity(newCity);
                    const firstZone = METRO_ZONES[newCity as keyof typeof METRO_ZONES]?.[0]?.id || "STADIUM";
                    setPrimaryZone(firstZone);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="BENGALURU">Bengaluru (Bangalore)</option>
                  <option value="DELHI">Delhi NCR (Gurgaon &amp; Noida)</option>
                  <option value="MUMBAI">Mumbai Financial Capital</option>
                  <option value="HYDERABAD">Hyderabad HITEC City</option>
                  <option value="CHENNAI">Chennai OMR Corridor</option>
                  <option value="KOLKATA">Kolkata Salt Lake</option>
                </select>
              </div>

              {/* Primary Zone Selector */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  2. Primary Operating Sector
                </label>
                <select
                  value={primaryZone}
                  onChange={(e) => setPrimaryZone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {(METRO_ZONES[city] || []).map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} &bull; {z.demand}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Category */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  3. Vehicle Category
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="UBER_GO">Uber Go (Sedan / Hatchback)</option>
                  <option value="UBER_PREMIER">Uber Premier (Ertiga / Innova)</option>
                  <option value="UBER_AUTO">Uber Auto (3-Wheeler)</option>
                  <option value="UBER_GREEN_EV">Uber Green (Electric Vehicle)</option>
                </select>
              </div>

              {/* License Plate Number */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  4. Commercial Vehicle Plate
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="e.g. KA 01 UB 8088"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Vehicle Model */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  5. Vehicle Model
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. Maruti Suzuki Dzire VXI"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Daily Shift Target Earnings */}
              <div>
                <label className="text-[10px] font-mono text-zinc-400 block mb-1">
                  6. Daily Shift Earnings Target (₹ INR)
                </label>
                <input
                  type="number"
                  value={dailyEarningsTarget}
                  onChange={(e) => setDailyEarningsTarget(Number(e.target.value))}
                  placeholder="2500"
                  step="250"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Outstation Checkbox */}
            <label className="flex items-center gap-2 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={willingOutstation}
                onChange={(e) => setWillingOutstation(e.target.checked)}
                className="rounded accent-cyan-400 h-4 w-4"
              />
              <span>
                <strong>Enable Pan-India Tourist &amp; Outstation Rides</strong> (Taj Mahal, Goa, Mysore, Varanasi Ghats, Kedarnath, etc. with +40% premium fare)
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep("LOGIN")}
                className="text-xs text-zinc-400 hover:text-white"
              >
                &larr; Back to Accounts
              </button>
              <button
                type="button"
                onClick={handleSaveTerritory}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-extrabold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Territory &amp; Enter Marketplace</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
