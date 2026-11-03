"use client";

import React, { useEffect, useRef, useState } from "react";
import { MarketplaceState, ZoneId, Driver } from "@/lib/uber/types";
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
  Flame,
  Globe2,
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
    // Official Google Maps with Real Live Traffic Congestion Mesh
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

  const [mapStyle, setMapStyle] = useState<MapTileStyle>("google_traffic");
  const [isTrafficOverlayOn, setIsTrafficOverlayOn] = useState<boolean>(true);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [activeMetroId, setActiveMetroId] = useState<string>("INDIA");
  const [liveClock, setLiveClock] = useState<string>("");

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
          zoom: 5, // Full India view
          minZoom: 4, // Allows zooming completely out to view entire subcontinent
          maxZoom: 19, // Street level
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

      // Toggle traffic overlay layer
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

  // 4. Update Zones, Routes, and Vehicle Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      const zonesLayer = zonesLayerRef.current;
      const routesLayer = routesLayerRef.current;
      const markersLayer = markersLayerRef.current;
      const cityClustersLayer = cityClustersLayerRef.current;
      if (!map || !zonesLayer || !routesLayer || !markersLayer || !cityClustersLayer) return;

      // A. Pan-India Metro Overview Badges (Visible across Whole India)
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

      // B. Zones with Glowing Surge Multipliers
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

      // C. Render Dynamic Arterial Routes
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

      // D. Smooth Non-Flickering Car Marker Updates
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

  const selectedDriver = selectedDriverId
    ? state.drivers.find((d) => d.id === selectedDriverId) || null
    : null;

  return (
    <div className="relative w-full h-[580px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Real Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Bar: Pan-India Quick-Fly Metro Hubs */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-1.5 bg-zinc-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl max-w-[85%]">
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
            {hub.id === "INDIA" && <Globe2 className="h-3.5 w-3.5 text-amber-400" />}
            <span>{hub.name}</span>
          </button>
        ))}
      </div>

      {/* Top Right: Real Map Tiles + Real Live Traffic Toggle */}
      <div className="absolute top-4 right-14 z-10 flex items-center gap-2">
        {/* Real Live Traffic ON/OFF Button */}
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

      {/* Floating Bottom Left: Pan-India Live Radar & Traffic Legend */}
      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-3.5 space-y-2 text-[10px] font-mono shadow-2xl">
        <div className="flex items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>PAN-INDIA FLEET RADAR &bull; 6 METROS</span>
          </div>
          <span className="text-zinc-400 flex items-center gap-1 font-mono text-[9px]">
            <Clock className="h-3 w-3" />
            <span>{liveClock || "LIVE"} IST</span>
          </span>
        </div>

        {/* Real Traffic Congestion Legend */}
        <div className="flex items-center gap-3 pt-1 border-t border-zinc-800/80 text-[9px]">
          <span className="text-zinc-400 font-sans font-bold">Traffic Congestion:</span>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">Fast</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-amber-500" />
            <span className="text-zinc-300">Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-4 rounded-full bg-rose-500" />
            <span className="text-zinc-300">Slow</span>
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

      {/* Floating Selected Driver Card (Glassmorphism Live Telemetry) */}
      {selectedDriver && (
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