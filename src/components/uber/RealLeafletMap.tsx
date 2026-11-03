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
  Info,
} from "lucide-react";

interface RealLeafletMapProps {
  state: MarketplaceState;
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  onSelectDriverForCopilot?: (driver: Driver) => void;
}

type MapTileStyle = "google_traffic" | "google_satellite" | "google_terrain" | "uber_midnight";

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
  google_terrain: {
    url: "https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps Terrain",
    maxZoom: 20,
  },
  uber_midnight: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri World Dark Gray Canvas",
    maxZoom: 18,
  },
};

const METRO_HUBS = [
  { id: "INDIA", name: "🇮🇳 Whole India", lat: 22.0, lng: 79.0, zoom: 5 },
  { id: "BLR", name: "Bengaluru", lat: 12.9756, lng: 77.6097, zoom: 12 },
  { id: "DEL", name: "Delhi NCR", lat: 28.6139, lng: 77.2090, zoom: 11 },
  { id: "BOM", name: "Mumbai", lat: 19.0760, lng: 72.8777, zoom: 11 },
  { id: "HYD", name: "Hyderabad", lat: 17.3850, lng: 78.4867, zoom: 12 },
  { id: "MAA", name: "Chennai", lat: 12.9800, lng: 80.2200, zoom: 12 },
  { id: "CCU", name: "Kolkata", lat: 22.5726, lng: 88.3639, zoom: 12 },
];

export default function RealLeafletMap({
  state,
  selectedZone,
  onSelectZone,
  onSelectDriverForCopilot,
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

  // Voice Synthesis (TTS) Helper
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*_#`~]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.lang = "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  // Voice Assistant Speech-to-Text handler
  const toggleVoiceAssistant = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
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
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsVoiceListening(true);
        setVoiceFeedbackText("Listening... (e.g., 'Take me to Taj Mahal', 'Show Mumbai traffic')");
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          processVoiceCommand(transcript);
        }
      };

      recognition.onerror = () => {
        setIsVoiceListening(false);
        setVoiceFeedbackText("Could not hear clearly. Please try again.");
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

  // Process natural language voice command
  const processVoiceCommand = (command: string) => {
    const cmd = command.toLowerCase().trim();
    setVoiceFeedbackText(`"${command}"`);

    // 1. Check for tourist place names
    const matchedPlace = INDIA_TOURIST_PLACES.find(
      (p) =>
        cmd.includes(p.name.toLowerCase()) ||
        cmd.includes(p.city.toLowerCase()) ||
        (p.id === "taj_mahal" && (cmd.includes("taj") || cmd.includes("agra"))) ||
        (p.id === "baga_beach" && cmd.includes("goa")) ||
        (p.id === "golden_temple" && (cmd.includes("golden") || cmd.includes("amritsar"))) ||
        (p.id === "kedarnath_temple" && cmd.includes("kedarnath")) ||
        (p.id === "varanasi_ghats" && (cmd.includes("varanasi") || cmd.includes("kashi") || cmd.includes("ganga"))) ||
        (p.id === "rohtang_pass" && (cmd.includes("manali") || cmd.includes("rohtang"))) ||
        (p.id === "mysore_palace" && cmd.includes("mysore")) ||
        (p.id === "hampi_unesco" && cmd.includes("hampi")) ||
        (p.id === "alleppey_backwaters" && (cmd.includes("alleppey") || cmd.includes("kerala"))) ||
        (p.id === "statue_of_unity" && (cmd.includes("statue of unity") || cmd.includes("patel")))
    );

    if (matchedPlace) {
      handleSelectTouristPlace(matchedPlace);
      const reply = `Navigating to ${matchedPlace.name} in ${matchedPlace.city}, ${matchedPlace.state}. Estimated ${matchedPlace.uberCategory} fare is ${matchedPlace.estimatedFareFromHub}.`;
      speakText(reply);
      setTimeout(() => setVoiceFeedbackText(null), 4000);
      return;
    }

    // 2. Check for Metro Hubs
    if (cmd.includes("delhi")) {
      handleFlyTo(28.6139, 77.2090, 11, "DEL");
      speakText("Flying to Delhi NCR National Capital Region.");
    } else if (cmd.includes("mumbai")) {
      handleFlyTo(19.0760, 72.8777, 11, "BOM");
      speakText("Flying to Mumbai Financial Capital.");
    } else if (cmd.includes("bengaluru") || cmd.includes("bangalore")) {
      handleFlyTo(12.9756, 77.6097, 12, "BLR");
      speakText("Flying to Bengaluru Tech Capital.");
    } else if (cmd.includes("hyderabad")) {
      handleFlyTo(17.3850, 78.4867, 12, "HYD");
      speakText("Flying to Hyderabad HITEC City.");
    } else if (cmd.includes("chennai")) {
      handleFlyTo(12.9800, 80.2200, 12, "MAA");
      speakText("Flying to Chennai OMR IT Corridor.");
    } else if (cmd.includes("kolkata")) {
      handleFlyTo(22.5726, 88.3639, 12, "CCU");
      speakText("Flying to Kolkata City of Joy.");
    } else if (cmd.includes("india") || cmd.includes("whole") || cmd.includes("all")) {
      handleFlyTo(22.0, 79.0, 5, "INDIA");
      speakText("Zooming out to full India overview.");
    } else if (cmd.includes("traffic")) {
      setIsTrafficOverlayOn(true);
      speakText("Live Google traffic layer enabled across all roads.");
    } else {
      speakText(`Searching for ${command} across India.`);
      setSearchQuery(command);
    }

    setTimeout(() => setVoiceFeedbackText(null), 4000);
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

        L.control.zoom({ position: "topright" }).addTo(map);

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

  // 2. Handle Map Style Switcher (Google Traffic, Satellite, Terrain, Midnight)
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
        { name: "Delhi NCR", lat: 28.6139, lng: 77.2090, count: 18, surge: "1.4x" },
        { name: "Mumbai", lat: 19.0760, lng: 72.8777, count: 18, surge: "1.5x" },
        { name: "Bengaluru", lat: 12.9756, lng: 77.6097, count: 25, surge: "1.2x" },
        { name: "Hyderabad", lat: 17.3850, lng: 78.4867, count: 8, surge: "1.2x" },
        { name: "Chennai", lat: 13.0827, lng: 80.2707, count: 6, surge: "1.1x" },
        { name: "Kolkata", lat: 22.5726, lng: 88.3639, count: 6, surge: "1.2x" },
      ];

      metros.forEach((m) => {
        const metroHtml = `
          <div class="cursor-pointer select-none transition-transform hover:scale-110 -translate-x-1/2 -translate-y-1/2">
            <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-zinc-950/95 border border-indigo-500/60 shadow-2xl backdrop-blur-md">
              <span class="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span class="text-xs font-black text-white">${m.name}</span>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">${m.count} cars</span>
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
                ? "border-indigo-400 bg-indigo-950/95 ring-2 ring-indigo-400/50"
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
                ? "text-violet-400 font-semibold"
                : driver.status === "EN_ROUTE_SURGE"
                ? "text-cyan-400 font-semibold"
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
  }, [state, selectedZone, onSelectZone, selectedDriverId, mapStyle]);

  const handleFlyTo = (lat: number, lng: number, zoom: number = 12, hubId?: string) => {
    if (hubId) setActiveMetroId(hubId);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.5 });
    }
  };

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
    <div className="relative w-full h-[620px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Real Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* TOP LEFT: Prominent Location Search Bar with Autocomplete & Voice Search */}
      <div className="absolute top-4 left-4 z-20 w-80 sm:w-96">
        <div className="relative flex items-center bg-zinc-950/95 backdrop-blur-xl rounded-2xl border border-zinc-700/80 shadow-2xl p-1.5 ring-1 ring-white/10">
          <Search className="h-4 w-4 text-zinc-400 ml-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            placeholder="Search India (e.g. Taj Mahal, Goa, Kedarnath)..."
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

          {/* Voice Search Microphone inside Search Bar */}
          <button
            onClick={toggleVoiceAssistant}
            title={isVoiceListening ? "Listening... (Click to stop)" : "Search by Voice / AI Copilot"}
            className={`p-2 rounded-xl transition-all shrink-0 ${
              isVoiceListening
                ? "bg-rose-500 text-white animate-pulse ring-2 ring-rose-400"
                : "bg-indigo-600/90 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
            }`}
          >
            {isVoiceListening ? <Mic className="h-3.5 w-3.5 animate-bounce" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Live Search Autocomplete Dropdown */}
        {isSearchFocused && searchResults.length > 0 && (
          <div className="mt-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/98 backdrop-blur-2xl shadow-2xl overflow-hidden divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
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

        {/* Voice Assistant Live Feedback Pill */}
        {voiceFeedbackText && (
          <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl border border-indigo-500/60 bg-indigo-950/95 backdrop-blur-xl shadow-2xl text-xs text-indigo-200 animate-fadeIn">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0 animate-spin" />
            <span className="font-medium text-[11px]">{voiceFeedbackText}</span>
          </div>
        )}
      </div>

      {/* TOP CENTER: Pan-India Quick Metro Hubs */}
      <div className="absolute top-4 left-[410px] hidden xl:flex items-center gap-1.5 bg-zinc-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl z-10">
        {METRO_HUBS.map((hub) => (
          <button
            key={hub.id}
            onClick={() => handleFlyTo(hub.lat, hub.lng, hub.zoom, hub.id)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              activeMetroId === hub.id
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                : "text-zinc-300 hover:text-white hover:bg-zinc-800"
            }`}
          >
            {hub.id === "INDIA" && <Globe2 className="h-3 w-3 text-amber-400" />}
            <span>{hub.name}</span>
          </button>
        ))}
      </div>

      {/* TOP RIGHT: Real Map Tiles + Tourist Places Toggle + Live Traffic Toggle */}
      <div className="absolute top-4 right-14 z-10 flex items-center gap-2">
        {/* Tourist Places Toggle */}
        <button
          onClick={() => setIsTouristLayerOn(!isTouristLayerOn)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all shadow-xl backdrop-blur-md ${
            isTouristLayerOn
              ? "bg-amber-500/20 border-amber-500/60 text-amber-300 ring-2 ring-amber-500/30"
              : "bg-zinc-950/90 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <Landmark className="h-3.5 w-3.5 text-amber-400" />
          <span>{INDIA_TOURIST_PLACES.length} Tourist Places {isTouristLayerOn ? "ON" : "OFF"}</span>
        </button>

        {/* Live Traffic Toggle */}
        <button
          onClick={() => setIsTrafficOverlayOn(!isTrafficOverlayOn)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all shadow-xl backdrop-blur-md ${
            isTrafficOverlayOn
              ? "bg-rose-500/20 border-rose-500/60 text-rose-300 ring-2 ring-rose-500/30"
              : "bg-zinc-950/90 border-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${isTrafficOverlayOn ? "bg-rose-400 animate-pulse" : "bg-zinc-500"}`} />
          <span>Live Traffic {isTrafficOverlayOn ? "ON" : "OFF"}</span>
        </button>

        {/* Style Switcher */}
        <div className="flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md p-1 rounded-2xl border border-zinc-800 shadow-xl text-[11px] font-semibold">
          <button
            onClick={() => setMapStyle("google_traffic")}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              mapStyle === "google_traffic"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Google Traffic
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
          <button
            onClick={() => setMapStyle("uber_midnight")}
            className={`px-2.5 py-1 rounded-xl transition-all ${
              mapStyle === "uber_midnight"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* FLOATING BOTTOM LEFT: Pan-India Live Radar & Traffic Legend */}
      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-3.5 space-y-2 text-[10px] font-mono shadow-2xl">
        <div className="flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>PAN-INDIA FLEET &bull; 6 METROS &bull; 32+ TOURIST HUBS</span>
          </div>
          <span className="text-zinc-400 flex items-center gap-1 font-mono text-[9px]">
            <Clock className="h-3 w-3" />
            <span>{liveClock || "LIVE"} IST</span>
          </span>
        </div>

        {/* Real Traffic Congestion Legend */}
        <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/80 text-[9px]">
          <span className="text-zinc-400 font-sans font-bold">Google Live Traffic:</span>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">Fast Flow</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-amber-500" />
            <span className="text-zinc-300">Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-rose-500" />
            <span className="text-zinc-300">Congested</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-rose-900" />
            <span className="text-zinc-300">Heavy Jam</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-300">Idle ({state.drivers.filter((d) => d.status === "IDLE").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-zinc-300">Surge ({state.drivers.filter((d) => d.status === "EN_ROUTE_SURGE").length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            <span className="text-zinc-300">Active Trip ({state.drivers.filter((d) => d.status === "ON_TRIP").length})</span>
          </div>
        </div>
      </div>

      {/* FLOATING TOURIST DESTINATION CARD */}
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
              <span>Popular For:</span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {selectedTouristPlace.popularFor}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Uber Service:</span>
              <span className="text-emerald-400 font-bold">
                {selectedTouristPlace.uberCategory}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Estimated Fare:</span>
              <span className="text-amber-400 font-bold font-mono">
                {selectedTouristPlace.estimatedFareFromHub}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Typical Duration:</span>
              <span className="text-white font-mono">
                {selectedTouristPlace.typicalVisitHours}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center gap-2">
            <button
              onClick={() => {
                speakText(`Tourist destination ${selectedTouristPlace.name} in ${selectedTouristPlace.city}. ${selectedTouristPlace.description}. Estimated ${selectedTouristPlace.uberCategory} fare is ${selectedTouristPlace.estimatedFareFromHub}.`);
              }}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
              title="Speak destination details"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleFlyTo(selectedTouristPlace.lat, selectedTouristPlace.lng, 17)}
              className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-lg shadow-amber-500/25"
            >
              Zoom Street / Satellite View
            </button>
          </div>
        </div>
      )}

      {/* FLOATING DRIVER CARD */}
      {selectedDriver && !selectedTouristPlace && (
        <div className="absolute bottom-4 right-4 z-20 w-84 rounded-2xl border border-indigo-500/50 bg-zinc-950/95 backdrop-blur-xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
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
                <Gauge className="h-3 w-3 text-cyan-400" />
                <span>Live GPS Speed</span>
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
                <span>Level</span>
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
              <span className="text-zinc-500">Earnings: </span>
              <span className="text-white font-bold">₹{selectedDriver.earningsToday}</span>
              <span className="text-zinc-500 text-[9px]"> ({selectedDriver.tripsCompleted} trips)</span>
            </div>
            <div>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                  selectedDriver.status === "ON_TRIP"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                    : selectedDriver.status === "EN_ROUTE_SURGE"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
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