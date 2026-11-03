"use client";

import React, { useEffect, useRef, useState } from "react";
import { MarketplaceState, ZoneId, Driver } from "@/lib/uber/types";
import { INDIA_TOURIST_PLACES, TouristPlace } from "@/lib/uber/touristPlaces";
import {
  Zap,
  Navigation,
  BatteryCharging,
  Fuel,
  Star,
  Car,
  X,
  Compass,
  Layers,
  Radio,
  Clock,
  Gauge,
  MapPin,
  Search,
  Mic,
  MicOff,
  Volume2,
  Globe2,
  Landmark,
  Sparkles,
  ChevronRight,
  Languages,
} from "lucide-react";

interface RealLeafletMapProps {
  state: MarketplaceState;
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  onSelectDriverForCopilot?: (driver: Driver) => void;
  flyToCoords?: [number, number] | null;
}

type MapTileStyle = "google_traffic" | "google_satellite" | "uber_midnight";

interface TileConfig {
  url: string;
  subdomains?: string[];
  attribution: string;
  maxZoom: number;
}

const TILE_CONFIGS: Record<MapTileStyle, TileConfig> = {
  google_traffic: {
    url: "https://mt{s}.google.com/vt/lyrs=m,traffic|seconds_into_week:-1&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps Live Traffic &mdash; Pan-India Real-Time Transit",
    maxZoom: 20,
  },
  google_satellite: {
    url: "https://mt{s}.google.com/vt/lyrs=y,traffic|seconds_into_week:-1&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Earth Satellite & Live Traffic",
    maxZoom: 20,
  },
  uber_midnight: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Dark Gray Canvas",
    maxZoom: 18,
  },
};

const METRO_HUBS = [
  { id: "INDIA", nameEn: "🇮🇳 Whole India", nameHi: "🇮🇳 पूरा भारत", lat: 22.0, lng: 79.0, zoom: 5 },
  { id: "DEL", nameEn: "Delhi NCR", nameHi: "दिल्ली NCR", lat: 28.6139, lng: 77.2090, zoom: 11 },
  { id: "BOM", nameEn: "Mumbai", nameHi: "मुंबई", lat: 19.0760, lng: 72.8777, zoom: 11 },
  { id: "BLR", nameEn: "Bengaluru", nameHi: "बेंगलुरु", lat: 12.9756, lng: 77.6097, zoom: 12 },
  { id: "HYD", nameEn: "Hyderabad", nameHi: "हैदराबाद", lat: 17.3850, lng: 78.4867, zoom: 12 },
  { id: "MAA", nameEn: "Chennai", nameHi: "चेन्नई", lat: 12.9800, lng: 80.2200, zoom: 12 },
  { id: "CCU", nameEn: "Kolkata", nameHi: "कोलकाता", lat: 22.5726, lng: 88.3639, zoom: 12 },
];

export default function RealLeafletMap({
  state,
  selectedZone,
  onSelectZone,
  onSelectDriverForCopilot,
  flyToCoords,
}: RealLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const activeTileLayerRef = useRef<any>(null);
  const trafficOverlayLayerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const markersLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const routesLayerRef = useRef<any>(null);
  const cityClustersLayerRef = useRef<any>(null);
  const touristLayerRef = useRef<any>(null);

  const [mapStyle, setMapStyle] = useState<MapTileStyle>("google_traffic");
  const [isTrafficOverlayOn, setIsTrafficOverlayOn] = useState<boolean>(true);
  const [isTouristLayerOn, setIsTouristLayerOn] = useState<boolean>(true);
  const [voiceLang, setVoiceLang] = useState<"hi" | "en">("hi"); // Default to Hindi as requested
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedTouristPlace, setSelectedTouristPlace] = useState<TouristPlace | null>(null);
  const [activeMetroId, setActiveMetroId] = useState<string>("INDIA");
  const [liveClock, setLiveClock] = useState<string>("");

  // Location Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<TouristPlace[]>([]);

  // Voice Assistant State
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceFeedbackText, setVoiceFeedbackText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Live ticking clock for India (IST)
  useEffect(() => {
    const updateTime = () => {
      setLiveClock(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Asia/Kolkata",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Filter search results in real time as user types
  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    const matches = INDIA_TOURIST_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.popularFor.toLowerCase().includes(q)
    ).slice(0, 7);
    setSearchResults(matches);
  }, [searchQuery]);

  // Pre-load speech synthesis voices on mount for prompt Hindi voice detection
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const getV = () => window.speechSynthesis.getVoices();
      getV();
      window.speechSynthesis.onvoiceschanged = getV;
    }
  }, []);

  // Voice Synthesis (TTS) in Natural Hindi or English
  const speakVoice = (text: string, forceLang?: "hi" | "en") => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text.replace(/[*_#`~]/g, "").replace(/[^\w\s\u0900-\u097F₹.,!?-]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const targetLang = forceLang || voiceLang;
    utterance.lang = targetLang === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.92; // Slightly measured, natural human cadence
    utterance.pitch = 1.0;

    // Search for best Hindi voice in user's browser
    if (targetLang === "hi") {
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(
        (v) =>
          v.lang === "hi-IN" ||
          v.lang.startsWith("hi") ||
          v.name.includes("Hindi") ||
          v.name.includes("हिन्दी") ||
          v.name.includes("Hemant") ||
          v.name.includes("Kalpana") ||
          v.name.includes("Lekha")
      );
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Human Voice Assistant Speech-to-Text Handler (Hindi & English)
  const toggleVoiceAssistant = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        voiceLang === "hi"
          ? "इस ब्राउज़र में आवाज़ पहचान समर्थित नहीं है। कृपया Chrome, Edge, या Safari का उपयोग करें।"
          : "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }

    if (isVoiceListening) {
      recognitionRef.current?.stop();
      setIsVoiceListening(false);
      setVoiceFeedbackText(null);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = voiceLang === "hi" ? "hi-IN" : "en-IN";

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceFeedbackText(
          voiceLang === "hi"
            ? "सुन रहा हूँ... बोलिए (जैसे: 'ताज महल ले चलो', 'मुंबई का ट्रैफिक दिखाओ', 'पूरा भारत दिखाओ')"
            : "Listening... speak now (e.g., 'Take me to Taj Mahal', 'Show Mumbai traffic')"
        );
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
        setVoiceFeedbackText(
          voiceLang === "hi" ? "आवाज़ स्पष्ट नहीं आई। कृपया पुनः प्रयास करें।" : "Could not hear clearly. Please try again."
        );
        setTimeout(() => setVoiceFeedbackText(null), 3000);
      };

      recognition.onend = () => {
        setIsVoiceListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech recognition error:", e);
      setIsVoiceListening(false);
    }
  };

  // Natural Language Hindi & English Voice Command Parser
  const processVoiceCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();
    setVoiceFeedbackText(`"${command}"`);

    // 1. Tourist Places Matching (Hindi & English)
    const matchedPlace = INDIA_TOURIST_PLACES.find(
      (p) =>
        cmd.includes(p.name.toLowerCase()) ||
        cmd.includes(p.city.toLowerCase()) ||
        (p.id === "taj_mahal" && (cmd.includes("ताज") || cmd.includes("आगरा") || cmd.includes("taj"))) ||
        (p.id === "baga_beach" && (cmd.includes("गोवा") || cmd.includes("गोआ") || cmd.includes("goa") || cmd.includes("बीच"))) ||
        (p.id === "golden_temple" && (cmd.includes("स्वर्ण") || cmd.includes("गोल्डन") || cmd.includes("अमृतसर") || cmd.includes("golden"))) ||
        (p.id === "kedarnath_temple" && (cmd.includes("केदारनाथ") || cmd.includes("kedarnath"))) ||
        (p.id === "varanasi_ghats" && (cmd.includes("वाराणसी") || cmd.includes("काशी") || cmd.includes("बनारस") || cmd.includes("गंगा") || cmd.includes("varanasi"))) ||
        (p.id === "rohtang_pass" && (cmd.includes("मनाली") || cmd.includes("रोहतांग") || cmd.includes("manali"))) ||
        (p.id === "mysore_palace" && (cmd.includes("मैसूर") || cmd.includes("mysore"))) ||
        (p.id === "hampi_unesco" && (cmd.includes("हम्पी") || cmd.includes("hampi"))) ||
        (p.id === "alleppey_backwaters" && (cmd.includes("केरल") || cmd.includes("अल्लेप्पी") || cmd.includes("kerala"))) ||
        (p.id === "statue_of_unity" && (cmd.includes("स्टैच्यू") || cmd.includes("पटेल") || cmd.includes("unity"))) ||
        (p.id === "red_fort" && (cmd.includes("लाल किला") || cmd.includes("red fort"))) ||
        (p.id === "qutub_minar" && (cmd.includes("कुतुब") || cmd.includes("qutub"))) ||
        (p.id === "charminar_hyderabad" && (cmd.includes("चारमीनार") || cmd.includes("charminar"))) ||
        (p.id === "victoria_memorial" && (cmd.includes("विक्टोरिया") || cmd.includes("हावड़ा") || cmd.includes("victoria")))
    );

    if (matchedPlace) {
      handleSelectTouristPlace(matchedPlace);
      const hindiReply = `${matchedPlace.name}, ${matchedPlace.city} का नक्शा खोला जा रहा है। उबर आउटस्टेशन का अनुमानित किराया ${matchedPlace.estimatedFareFromHub} है।`;
      const englishReply = `Navigating to ${matchedPlace.name} in ${matchedPlace.city}, ${matchedPlace.state}. Estimated fare is ${matchedPlace.estimatedFareFromHub}.`;
      speakVoice(voiceLang === "hi" ? hindiReply : englishReply);
      setTimeout(() => setVoiceFeedbackText(null), 5000);
      return;
    }

    // 2. City / Metro Matching (Hindi & English)
    if (cmd.includes("दिल्ली") || cmd.includes("delhi") || cmd.includes("गुड़गांव") || cmd.includes("नोएडा")) {
      handleFlyTo(28.6139, 77.2090, 11, "DEL");
      speakVoice(voiceLang === "hi" ? "दिल्ली NCR का लाइव नक्शा दिखाया जा रहा है।" : "Flying to Delhi NCR National Capital.");
    } else if (cmd.includes("मुंबई") || cmd.includes("बॉम्बे") || cmd.includes("mumbai")) {
      handleFlyTo(19.0760, 72.8777, 11, "BOM");
      speakVoice(voiceLang === "hi" ? "मुंबई का लाइव नक्शा और बीकेसी वित्तीय केंद्र खोला जा रहा है।" : "Navigating to Mumbai Financial Capital.");
    } else if (cmd.includes("बेंगलुरु") || cmd.includes("बैंगलोर") || cmd.includes("bengaluru") || cmd.includes("bangalore")) {
      handleFlyTo(12.9756, 77.6097, 12, "BLR");
      speakVoice(voiceLang === "hi" ? "बेंगलुरु टेक कॉरिडोर और एम. चिन्नास्वामी स्टेडियम का दृश्य दिखाया जा रहा है।" : "Flying to Bengaluru Tech Corridor.");
    } else if (cmd.includes("हैदराबाद") || cmd.includes("hyderabad")) {
      handleFlyTo(17.3850, 78.4867, 12, "HYD");
      speakVoice(voiceLang === "hi" ? "हैदराबाद हाईटेक सिटी का नक्शा दिखाया जा रहा है।" : "Flying to Hyderabad HITEC City.");
    } else if (cmd.includes("चेन्नई") || cmd.includes("मद्रास") || cmd.includes("chennai")) {
      handleFlyTo(12.9800, 80.2200, 12, "MAA");
      speakVoice(voiceLang === "hi" ? "चेन्नई ओएमआर आईटी एक्सप्रेसवे का दृश्य खोला जा रहा है।" : "Flying to Chennai OMR Corridor.");
    } else if (cmd.includes("कोलकाता") || cmd.includes("कलकत्ता") || cmd.includes("kolkata")) {
      handleFlyTo(22.5726, 88.3639, 12, "CCU");
      speakVoice(voiceLang === "hi" ? "कोलकाता सॉल्ट लेक सेक्टर 5 का दृश्य दिखाया जा रहा है।" : "Flying to Kolkata City of Joy.");
    } else if (cmd.includes("भारत") || cmd.includes("देश") || cmd.includes("इंडिया") || cmd.includes("india") || cmd.includes("whole") || cmd.includes("all")) {
      handleFlyTo(22.0, 79.0, 5, "INDIA");
      speakVoice(voiceLang === "hi" ? "पूरा भारत का दृश्य दिखाया जा रहा है। सभी 6 प्रमुख महानगर सक्रिय हैं।" : "Zooming out to full India overview.");
    } else if (cmd.includes("ट्रैफिक") || cmd.includes("जाम") || cmd.includes("traffic")) {
      setIsTrafficOverlayOn(true);
      speakVoice(voiceLang === "hi" ? "गूगल लाइव ट्रैफिक सभी सड़कों पर चालू कर दिया गया है।" : "Live Google Traffic layer enabled.");
    } else {
      speakVoice(voiceLang === "hi" ? `${command} के लिए खोजा जा रहा है।` : `Searching for ${command}.`);
      setSearchQuery(command);
    }

    setTimeout(() => setVoiceFeedbackText(null), 5000);
  };

  // 1. Initialize Leaflet Map once with Pan-India Zoom Boundaries
  useEffect(() => {
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Initialize Map centered on India (allowing full zoom out to see whole country)
        const map = L.map(mapContainerRef.current, {
          center: [22.0, 79.0],
          zoom: 5,
          minZoom: 4,
          maxZoom: 19,
          zoomControl: false,
        });

        // Add custom zoom control in bottom right so it doesn't collide with top menus
        L.control.zoom({ position: "bottomright" }).addTo(map);

        // Add Base Tile Layer (Google Maps Traffic)
        const cfg = TILE_CONFIGS[mapStyle];
        const tileLayer = L.tileLayer(cfg.url, {
          subdomains: cfg.subdomains || ["0", "1", "2", "3"],
          attribution: cfg.attribution,
          maxZoom: cfg.maxZoom,
        }).addTo(map);

        activeTileLayerRef.current = tileLayer;

        // Dedicated Live Traffic Overlay
        const trafficLayer = L.tileLayer(
          "https://mt{s}.google.com/vt/lyrs=h,traffic|seconds_into_week:-1&x={x}&y={y}&z={z}",
          { subdomains: ["0", "1", "2", "3"], maxZoom: 20, opacity: 0.95 }
        ).addTo(map);
        trafficOverlayLayerRef.current = trafficLayer;

        // Initialize Layer Groups
        zonesLayerRef.current = L.featureGroup().addTo(map);
        routesLayerRef.current = L.featureGroup().addTo(map);
        cityClustersLayerRef.current = L.featureGroup().addTo(map);
        touristLayerRef.current = L.featureGroup().addTo(map);
        markersLayerRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Handle Map Style Switcher (Google Traffic, Satellite, Midnight)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (activeTileLayerRef.current) {
        map.removeLayer(activeTileLayerRef.current);
      }

      const cfg = TILE_CONFIGS[mapStyle];
      const newTile = L.tileLayer(cfg.url, {
        subdomains: cfg.subdomains || ["0", "1", "2", "3"],
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      }).addTo(map);

      activeTileLayerRef.current = newTile;

      if (trafficOverlayLayerRef.current) {
        if (isTrafficOverlayOn) {
          trafficOverlayLayerRef.current.addTo(map);
        } else {
          map.removeLayer(trafficOverlayLayerRef.current);
        }
      }
    });
  }, [mapStyle, isTrafficOverlayOn]);

  // 3. Helper to generate realistic top-down SVG car icon
  const getCarSvg = (driver: Driver, isSelected: boolean) => {
    const isEnRoute = driver.status === "EN_ROUTE_SURGE";
    const isOnTrip = driver.status === "ON_TRIP";

    let bodyFill = "#18181b";
    let trimColor = "#6366f1";
    let headlightColor = "#fef08a";

    if (driver.vehicleType === "UBER_GREEN_EV") {
      bodyFill = "#064e3b";
      trimColor = "#10b981";
      headlightColor = "#a7f3d0";
    } else if (driver.vehicleType === "UBER_PREMIER") {
      bodyFill = "#09090b";
      trimColor = "#eab308";
      headlightColor = "#fef08a";
    } else if (driver.vehicleType === "UBER_AUTO") {
      bodyFill = "#ca8a04";
      trimColor = "#15803d";
      headlightColor = "#fef08a";
    }

    if (isSelected) {
      trimColor = "#ffffff";
    }

    const statusGlow = isEnRoute
      ? "filter: drop-shadow(0 0 6px #06b6d4);"
      : isOnTrip
      ? "filter: drop-shadow(0 0 6px #8b5cf6);"
      : "filter: drop-shadow(0 0 5px #10b981);";

    return `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125" style="transform: rotate(${driver.heading || 0}deg); ${statusGlow}">
        <svg viewBox="0 0 24 38" width="18" height="30" class="drop-shadow-md">
          <rect x="2" y="3" width="20" height="32" rx="5" fill="${bodyFill}" stroke="${trimColor}" stroke-width="${isSelected ? '2.5' : '1.5'}"/>
          <path d="M4 12 Q12 9 20 12 L18 17 Q12 16 6 17 Z" fill="#38bdf8" fill-opacity="0.85"/>
          <rect x="5.5" y="19" width="13" height="7" rx="2" fill="${trimColor}" fill-opacity="0.4"/>
          <path d="M5.5 28 Q12 29 18.5 28 L18 31 Q12 32 6 31 Z" fill="#38bdf8" fill-opacity="0.7"/>
          <circle cx="5" cy="4" r="1.5" fill="${headlightColor}"/>
          <circle cx="19" cy="4" r="1.5" fill="${headlightColor}"/>
          <rect x="3.5" y="33" width="3" height="1.5" rx="0.5" fill="#ef4444"/>
          <rect x="17.5" y="33" width="3" height="1.5" rx="0.5" fill="#ef4444"/>
        </svg>
      </div>
    `;
  };

  // 4. Update Tourist Places Pins on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !touristLayerRef.current) return;

    import("leaflet").then((L) => {
      const touristLayer = touristLayerRef.current;
      touristLayer.clearLayers();

      if (!isTouristLayerOn) return;

      INDIA_TOURIST_PLACES.forEach((place) => {
        const isSelected = selectedTouristPlace?.id === place.id;

        const categoryEmoji =
          place.category === "MONUMENT"
            ? "🏛️"
            : place.category === "HERITAGE"
            ? "🏰"
            : place.category === "RELIGIOUS"
            ? "🛕"
            : place.category === "BEACH"
            ? "🏖️"
            : place.category === "HILL_STATION"
            ? "🏔️"
            : "🌲";

        const badgeHtml = `
          <div class="cursor-pointer select-none transition-transform hover:scale-125 -translate-x-1/2 -translate-y-1/2">
            <div class="flex items-center gap-1.5 px-2 py-1 rounded-xl ${
              isSelected
                ? "bg-amber-500 text-black font-extrabold ring-4 ring-amber-400/50 scale-110 shadow-2xl"
                : "bg-zinc-950/90 text-zinc-100 border border-amber-500/60 shadow-xl backdrop-blur-md"
            }">
              <span class="text-xs">${categoryEmoji}</span>
              <span class="text-[10px] font-bold whitespace-nowrap">${place.name}</span>
            </div>
          </div>
        `;

        const marker = L.marker([place.lat, place.lng], {
          icon: L.divIcon({
            html: badgeHtml,
            className: "custom-tourist-pin",
            iconSize: [0, 0],
          }),
        }).addTo(touristLayer);

        marker.on("click", () => {
          handleSelectTouristPlace(place);
        });
      });
    });
  }, [isTouristLayerOn, selectedTouristPlace]);

  // 5. Update Zones, Routes, and Vehicle Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      const zonesLayer = zonesLayerRef.current;
      const routesLayer = routesLayerRef.current;
      const markersLayer = markersLayerRef.current;
      const cityClustersLayer = cityClustersLayerRef.current;
      if (!map || !zonesLayer || !routesLayer || !markersLayer || !cityClustersLayer) return;

      // Pan-India Metro Overview Badges
      cityClustersLayer.clearLayers();
      const metros = [
        { name: voiceLang === "hi" ? "दिल्ली NCR" : "Delhi NCR", lat: 28.6139, lng: 77.2090, count: 18, surge: "1.4x" },
        { name: voiceLang === "hi" ? "मुंबई" : "Mumbai", lat: 19.0760, lng: 72.8777, count: 18, surge: "1.5x" },
        { name: voiceLang === "hi" ? "बेंगलुरु" : "Bengaluru", lat: 12.9756, lng: 77.6097, count: 25, surge: "1.2x" },
        { name: voiceLang === "hi" ? "हैदराबाद" : "Hyderabad", lat: 17.3850, lng: 78.4867, count: 8, surge: "1.2x" },
        { name: voiceLang === "hi" ? "चेन्नई" : "Chennai", lat: 13.0827, lng: 80.2707, count: 6, surge: "1.1x" },
        { name: voiceLang === "hi" ? "कोलकाता" : "Kolkata", lat: 22.5726, lng: 88.3639, count: 6, surge: "1.2x" },
      ];

      metros.forEach((m) => {
        const metroHtml = `
          <div class="cursor-pointer select-none transition-transform hover:scale-110 -translate-x-1/2 -translate-y-1/2">
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-950/95 border border-zinc-700 shadow-2xl backdrop-blur-md">
              <span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span class="text-xs font-black text-white">${m.name}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-200 font-bold">${m.count} cars</span>
              <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">${m.surge}</span>
            </div>
          </div>
        `;

        const metroMarker = L.marker([m.lat, m.lng], {
          icon: L.divIcon({
            html: metroHtml,
            className: "custom-metro-cluster",
            iconSize: [0, 0],
          }),
        }).addTo(cityClustersLayer);

        metroMarker.on("click", () => {
          map.flyTo([m.lat, m.lng], 12, { duration: 1.2 });
        });
      });

      // Zones with Surge Circles
      zonesLayer.clearLayers();
      Object.values(state.zones).forEach((zone) => {
        const isSelected = selectedZone === zone.id;
        const isHighSurge = zone.surgeMultiplier >= 2.0;
        const isSevereSurge = zone.surgeMultiplier >= 3.0;

        const color = isSevereSurge ? "#ef4444" : isHighSurge ? "#f59e0b" : "#10b981";

        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radiusMeters,
          color,
          weight: isSelected ? 3 : 1.5,
          fillColor: color,
          fillOpacity: isSevereSurge ? 0.35 : isHighSurge ? 0.25 : 0.12,
          dashArray: isSelected ? "4, 6" : undefined,
        }).addTo(zonesLayer);

        circle.on("click", () => onSelectZone(zone.id));

        const labelHtml = `
          <div class="cursor-pointer select-none transition-transform hover:scale-110 -translate-x-1/2 -translate-y-1/2">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
              isSelected
                ? "border-white bg-zinc-900 ring-2 ring-white/50"
                : isSevereSurge
                ? "border-rose-500/80 bg-rose-950/95 animate-pulse"
                : isHighSurge
                ? "border-amber-500/80 bg-amber-950/95"
                : "border-zinc-800 bg-zinc-950/90 text-white"
            } shadow-xl backdrop-blur-md">
              <span class="text-[11px] font-black text-white whitespace-nowrap">${zone.name.split(" ")[0]}</span>
              <span class="text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                isSevereSurge
                  ? "bg-rose-500 text-white"
                  : isHighSurge
                  ? "bg-amber-500 text-black font-extrabold"
                  : "bg-emerald-500/20 text-emerald-400"
              }">${zone.surgeMultiplier}x</span>
            </div>
          </div>
        `;

        const labelMarker = L.marker([zone.lat, zone.lng], {
          icon: L.divIcon({
            html: labelHtml,
            className: "custom-zone-label",
            iconSize: [0, 0],
          }),
        }).addTo(zonesLayer);

        labelMarker.on("click", () => onSelectZone(zone.id));
      });

      // Render Dynamic Arterial Routes
      routesLayer.clearLayers();
      state.drivers.forEach((driver) => {
        if (driver.routeCoordinates && driver.routeCoordinates.length > 1) {
          const isEnRoute = driver.status === "EN_ROUTE_SURGE";
          L.polyline(driver.routeCoordinates, {
            color: isEnRoute ? "#06b6d4" : "#8b5cf6",
            weight: 2.5,
            opacity: 0.8,
            dashArray: "4, 6",
          }).addTo(routesLayer);
        }
      });

      // Smooth Car Marker Updates
      state.drivers.forEach((driver) => {
        const isSelected = selectedDriverId === driver.id;
        const carHtml = getCarSvg(driver, isSelected);

        const tooltipContent = `
          <div class="text-xs font-sans space-y-0.5">
            <div class="font-bold flex items-center justify-between gap-2">
              <span>${driver.name}</span>
              <span class="text-amber-400 text-[10px]">★ ${driver.rating}</span>
            </div>
            <div class="text-zinc-400 text-[10px] font-mono">
              ${driver.city} &bull; ${driver.vehicleModel} &bull; ${driver.speedKmh || 0} km/h
            </div>
            <div class="text-[10px] ${
              driver.status === "ON_TRIP"
                ? "text-amber-400 font-semibold"
                : driver.status === "EN_ROUTE_SURGE"
                ? "text-emerald-300 font-semibold"
                : "text-emerald-400"
            }">
              ${driver.status === "ON_TRIP" ? `Trip to ${driver.currentTripDestinationName || "CBD"}` : driver.status}
            </div>
            <div class="text-[10px] text-zinc-300">Earnings: ₹${driver.earningsToday}</div>
          </div>
        `;

        if (markersMapRef.current.has(driver.id)) {
          const existingMarker = markersMapRef.current.get(driver.id);
          existingMarker.setLatLng([driver.lat, driver.lng]);
          existingMarker.setIcon(
            L.divIcon({
              html: carHtml,
              className: "custom-car-marker",
              iconSize: [20, 34],
              iconAnchor: [10, 17],
            })
          );
          existingMarker.setTooltipContent(tooltipContent);
        } else {
          const marker = L.marker([driver.lat, driver.lng], {
            icon: L.divIcon({
              html: carHtml,
              className: "custom-car-marker",
              iconSize: [20, 34],
              iconAnchor: [10, 17],
            }),
          }).addTo(markersLayer);

          marker.on("click", () => {
            setSelectedDriverId(driver.id);
            setSelectedTouristPlace(null);
          });

          marker.bindTooltip(tooltipContent, {
            className: "custom-leaflet-tooltip",
            direction: "top",
            offset: [0, -12],
          });

          markersMapRef.current.set(driver.id, marker);
        }
      });
    });
  }, [state, selectedZone, onSelectZone, selectedDriverId, mapStyle, voiceLang]);

  const handleFlyTo = (lat: number, lng: number, zoom: number = 12, hubId?: string) => {
    if (hubId) setActiveMetroId(hubId);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
  };

  // Fly to driver's assigned sector when requested
  useEffect(() => {
    if (flyToCoords && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(flyToCoords, 13, { duration: 1.5 });
    }
  }, [flyToCoords]);

  const handleSelectTouristPlace = (place: TouristPlace) => {
    setSelectedTouristPlace(place);
    setSelectedDriverId(null);
    setSearchQuery("");
    setIsSearchFocused(false);
    handleFlyTo(place.lat, place.lng, place.zoomLevel || 15);
  };

  const selectedDriver = selectedDriverId
    ? state.drivers.find((d) => d.id === selectedDriverId) || null
    : null;

  return (
    <div className="relative w-full h-[640px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Real Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* =========================================================================
          TOP UNIFIED HEADER CONTROLS (CLEAN DRIVER HEADER - ZERO OVERLAP)
         ========================================================================= */}
      <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none flex flex-col gap-2">
        {/* ROW 1: Search Bar (Left) + Quick Settings (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Location Search Bar with Voice Mic */}
          <div className="pointer-events-auto flex-1 min-w-[220px] max-w-md relative">
            <div className="relative flex items-center bg-zinc-950/95 backdrop-blur-xl rounded-2xl border border-zinc-700/80 shadow-2xl p-1.5 ring-1 ring-white/10">
              <Search className="h-4 w-4 text-zinc-400 ml-2.5 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                placeholder={
                  voiceLang === "hi"
                    ? "स्थान खोजें (जैसे: ताज महल, गोवा, बीकेसी)..."
                    : "Search destination, airport, or tourist spot..."
                }
                className="w-full bg-transparent px-2.5 py-1.5 text-xs text-white placeholder-zinc-400 focus:outline-none"
              />

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="p-1 text-zinc-400 hover:text-white mr-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Voice Assistant Microphone Button inside Search Bar */}
              <button
                onClick={toggleVoiceAssistant}
                title={
                  isVoiceListening
                    ? voiceLang === "hi" ? "सुन रहा हूँ... (रोकने के लिए टैप करें)" : "Listening... (Tap to stop)"
                    : voiceLang === "hi" ? "हिंदी आवाज़ सहायक" : "Voice Assistant"
                }
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 flex items-center gap-1.5 font-bold text-xs ${
                  isVoiceListening
                    ? "bg-rose-500 text-white animate-pulse ring-2 ring-rose-400 shadow-lg shadow-rose-500/50"
                    : "bg-white hover:bg-zinc-200 text-black shadow-md font-bold"
                }`}
              >
                <Mic className={`h-3.5 w-3.5 ${isVoiceListening ? "animate-bounce" : ""}`} />
                <span>
                  {isVoiceListening ? (voiceLang === "hi" ? "सुन रहा हूँ" : "Listening") : (voiceLang === "hi" ? "बोलिए" : "Speak")}
                </span>
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {isSearchFocused && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-72 overflow-y-auto z-30">
                {searchResults.map((place) => (
                  <button
                    key={place.id}
                    onClick={() => handleSelectTouristPlace(place)}
                    className="w-full p-2.5 text-left hover:bg-zinc-900/90 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">
                          {place.category === "BEACH"
                            ? "🏖️"
                            : place.category === "RELIGIOUS"
                            ? "🛕"
                            : place.category === "HILL_STATION"
                            ? "🏔️"
                            : "🏛️"}
                        </span>
                        <span className="text-xs font-bold text-white">{place.name}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {place.city}, {place.state} &bull; {place.uberCategory}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {/* Live Voice Assistant Feedback Pill */}
            {voiceFeedbackText && (
              <div className="absolute top-full left-0 right-0 mt-1.5 flex items-center gap-2 p-2.5 rounded-xl border border-zinc-700 bg-zinc-900/98 backdrop-blur-xl shadow-2xl text-xs text-zinc-200 animate-fadeIn z-30">
                <Sparkles className="h-4 w-4 text-amber-400 shrink-0 animate-spin" />
                <span className="font-medium text-[11px] leading-snug">{voiceFeedbackText}</span>
              </div>
            )}
          </div>

          {/* TOP RIGHT: Language Toggle + Map Style (Sleek, Compact) */}
          <div className="pointer-events-auto flex items-center gap-1.5 shrink-0">
            {/* Hindi / English Voice Language Selector */}
            <div className="flex items-center gap-0.5 bg-zinc-950/95 backdrop-blur-xl p-1 rounded-2xl border border-zinc-800 shadow-xl text-xs font-bold">
              <button
                onClick={() => {
                  setVoiceLang("hi");
                  speakVoice("हिंदी वॉइस असिस्टेंट सक्रिय है। बोलिए, मैं क्या मदद करूँ?", "hi");
                }}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  voiceLang === "hi"
                    ? "bg-amber-500 text-black shadow-md font-extrabold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                🇮🇳 हिंदी
              </button>
              <button
                onClick={() => {
                  setVoiceLang("en");
                  speakVoice("English voice assistant activated. How can I assist your route?", "en");
                }}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  voiceLang === "en"
                    ? "bg-white text-black shadow-md font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>

            {/* Map Style Switcher (Traffic / Satellite) */}
            <div className="flex items-center gap-0.5 bg-zinc-950/95 backdrop-blur-xl p-1 rounded-2xl border border-zinc-800 shadow-xl text-xs font-semibold">
              <button
                onClick={() => setMapStyle("google_traffic")}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  mapStyle === "google_traffic"
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Traffic
              </button>
              <button
                onClick={() => setMapStyle("google_satellite")}
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  mapStyle === "google_satellite"
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Satellite
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: CITY CHIPS & QUICK LAYERS (HORIZONTALLY SCROLLABLE) */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Pan-India Metro Quick-Fly Buttons */}
          {METRO_HUBS.map((hub) => (
            <button
              key={hub.id}
              onClick={() => handleFlyTo(hub.lat, hub.lng, hub.zoom, hub.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 shrink-0 backdrop-blur-md shadow-md ${
                activeMetroId === hub.id
                  ? "bg-white text-black font-extrabold ring-1 ring-white/50"
                  : "bg-zinc-950/90 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
              }`}
            >
              {hub.id === "INDIA" && <Globe2 className="h-3 w-3 text-amber-400" />}
              <span>{voiceLang === "hi" ? hub.nameHi : hub.nameEn}</span>
            </button>
          ))}

          <span className="h-4 w-[1px] bg-zinc-800 shrink-0 mx-1" />

          {/* Toggle Tourist Places Button */}
          <button
            onClick={() => setIsTouristLayerOn(!isTouristLayerOn)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 backdrop-blur-md ${
              isTouristLayerOn
                ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                : "bg-zinc-950/90 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Landmark className="h-3 w-3 text-amber-400" />
            <span>{voiceLang === "hi" ? "32 पर्यटन स्थल" : "32 Tourist Hubs"}</span>
          </button>

          {/* Toggle Live Traffic Button */}
          <button
            onClick={() => setIsTrafficOverlayOn(!isTrafficOverlayOn)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 backdrop-blur-md ${
              isTrafficOverlayOn
                ? "bg-rose-500/20 border-rose-500/60 text-rose-300"
                : "bg-zinc-950/90 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isTrafficOverlayOn ? "bg-rose-400 animate-pulse" : "bg-zinc-500"}`} />
            <span>{voiceLang === "hi" ? "ट्रैफिक" : "Traffic"}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SLEEK FLOATING BOTTOM STATUS CHIP (MINIMAL & DRIVER-FRIENDLY)
         ========================================================================= */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-3.5 py-1.5 text-xs text-white shadow-xl pointer-events-auto">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="font-bold text-[11px]">
          {voiceLang === "hi" ? "गूगल लाइव ट्रैफिक" : "Google Live Traffic"}
        </span>
        <span className="text-zinc-500 text-[10px]">&bull;</span>
        <span className="text-zinc-300 text-[11px] font-mono">
          {state.drivers.length} {voiceLang === "hi" ? "कैब ऑनलाइन" : "Cabs Online"}
        </span>
      </div>

      {/* =========================================================================
          FLOATING TOURIST DESTINATION CARD
         ========================================================================= */}
      {selectedTouristPlace && (
        <div className="absolute bottom-4 right-4 z-20 w-84 sm:w-96 rounded-3xl border border-amber-500/50 bg-zinc-950/98 backdrop-blur-2xl p-5 shadow-2xl space-y-3 animate-fadeIn">
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 uppercase">
                  {selectedTouristPlace.category}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {selectedTouristPlace.city}, {selectedTouristPlace.state}
                </span>
              </div>
              <h3 className="text-sm font-black text-white mt-1">
                {selectedTouristPlace.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedTouristPlace(null)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {selectedTouristPlace.description}
          </p>

          <div className="space-y-1.5 text-[11px] pt-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span>{voiceLang === "hi" ? "प्रसिद्ध किसके लिए:" : "Popular For:"}</span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {selectedTouristPlace.popularFor}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>{voiceLang === "hi" ? "उबर श्रेणी:" : "Uber Service:"}</span>
              <span className="text-emerald-400 font-bold">
                {selectedTouristPlace.uberCategory}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>{voiceLang === "hi" ? "अनुमानित किराया:" : "Estimated Fare:"}</span>
              <span className="text-amber-400 font-bold font-mono">
                {selectedTouristPlace.estimatedFareFromHub}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>{voiceLang === "hi" ? "दर्शन समय:" : "Typical Duration:"}</span>
              <span className="text-white font-mono">
                {selectedTouristPlace.typicalVisitHours}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
            <button
              onClick={() => {
                const speechMsg =
                  voiceLang === "hi"
                    ? `${selectedTouristPlace.name}, ${selectedTouristPlace.city}। ${selectedTouristPlace.description}। अनुमानित उबर किराया ${selectedTouristPlace.estimatedFareFromHub} है।`
                    : `Tourist destination ${selectedTouristPlace.name} in ${selectedTouristPlace.city}. ${selectedTouristPlace.description}. Estimated ${selectedTouristPlace.uberCategory} fare is ${selectedTouristPlace.estimatedFareFromHub}.`;
                speakVoice(speechMsg);
              }}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title={voiceLang === "hi" ? "विवरण सुनें" : "Speak destination details"}
            >
              <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-amber-400 animate-bounce" : ""}`} />
            </button>
            <button
              onClick={() => handleFlyTo(selectedTouristPlace.lat, selectedTouristPlace.lng, 17)}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/25"
            >
              {voiceLang === "hi" ? "ज़ूम से देखें (सैटेलाइट व्यू)" : "Zoom Satellite View"}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          FLOATING DRIVER CARD
         ========================================================================= */}
      {selectedDriver && !selectedTouristPlace && (
        <div className="absolute bottom-4 right-4 z-20 w-84 rounded-2xl border border-zinc-700 bg-zinc-950/98 backdrop-blur-xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-xs shadow-md">
                {selectedDriver.name[0]}
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{selectedDriver.name}</span>
                  <span className="flex items-center text-[10px] text-amber-400 font-normal">
                    <Star className="h-3 w-3 fill-amber-400 inline mr-0.5" />
                    {selectedDriver.rating || 4.92}
                  </span>
                </h4>
                <p className="text-[10px] text-zinc-400 font-mono">
                  {selectedDriver.city} &bull; {selectedDriver.licensePlate}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDriverId(null)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 space-y-0.5">
              <span className="text-zinc-500 flex items-center gap-1">
                <Gauge className="h-3 w-3 text-zinc-300" />
                <span>{voiceLang === "hi" ? "लाइव स्पीड" : "Live GPS Speed"}</span>
              </span>
              <span className="text-white text-sm font-black block">
                {selectedDriver.speedKmh || 0} <span className="text-[10px] font-normal text-zinc-400">km/h</span>
              </span>
              <span className="text-zinc-400 text-[9px] block">
                Heading: {selectedDriver.heading || 0}&deg;
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 space-y-0.5">
              <span className="text-zinc-500 flex items-center gap-1">
                {selectedDriver.vehicleType === "UBER_GREEN_EV" ? (
                  <BatteryCharging className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Fuel className="h-3 w-3 text-amber-400" />
                )}
                <span>{voiceLang === "hi" ? "बैटरी / ईंधन" : "Level"}</span>
              </span>
              <span className="text-emerald-400 text-sm font-black block">
                {selectedDriver.batteryOrFuelPercent || 78}%
              </span>
              <span className="text-zinc-400 text-[9px] block">
                {selectedDriver.vehicleModel}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px] font-mono">
            <div>
              <span className="text-zinc-500">{voiceLang === "hi" ? "आज की कमाई: " : "Earnings: "}</span>
              <span className="text-white font-bold">₹{selectedDriver.earningsToday}</span>
              <span className="text-zinc-500 text-[9px]"> ({selectedDriver.tripsCompleted} trips)</span>
            </div>
            <div>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  selectedDriver.status === "ON_TRIP"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                    : selectedDriver.status === "EN_ROUTE_SURGE"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {selectedDriver.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}