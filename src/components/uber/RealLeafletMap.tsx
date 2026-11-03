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
} from "lucide-react";

interface RealLeafletMapProps {
  state: MarketplaceState;
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  onSelectDriverForCopilot?: (driver: Driver) => void;
}

type MapTileStyle = "google_streets" | "google_satellite" | "google_terrain" | "uber_midnight";

interface TileConfig {
  url: string;
  subdomains?: string[];
  attribution: string;
  maxZoom: number;
}

const TILE_CONFIGS: Record<MapTileStyle, TileConfig> = {
  google_streets: {
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Maps &mdash; Bengaluru Urban Transit Mesh",
    maxZoom: 20,
  },
  google_satellite: {
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: ["0", "1", "2", "3"],
    attribution: "&copy; Google Earth Imagery &mdash; Bengaluru Metro",
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

export default function RealLeafletMap({
  state,
  selectedZone,
  onSelectZone,
  onSelectDriverForCopilot,
}: RealLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const activeTileLayerRef = useRef<any>(null);
  const referenceTileLayerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const markersLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const routesLayerRef = useRef<any>(null);

  const [mapStyle, setMapStyle] = useState<MapTileStyle>("google_streets");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [liveClock, setLiveClock] = useState<string>("");

  // Live ticking clock for Bengaluru (IST)
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

  // 1. Initialize Leaflet Map once centered on Central Bengaluru
  useEffect(() => {
    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Fix Leaflet's default image path issues
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Center on Central Bengaluru (Chinnaswamy Stadium / MG Road / Cubbon Park)
        const map = L.map(mapContainerRef.current, {
          center: [12.975, 77.62],
          zoom: 12,
          minZoom: 10,
          maxZoom: 19,
          zoomControl: false,
        });

        L.control.zoom({ position: "topright" }).addTo(map);

        // Add initial Tile Layer (Google Maps Streets by default)
        const cfg = TILE_CONFIGS[mapStyle];
        const tileLayer = L.tileLayer(cfg.url, {
          subdomains: cfg.subdomains || ["a", "b", "c"],
          attribution: cfg.attribution,
          maxZoom: cfg.maxZoom,
        }).addTo(map);

        activeTileLayerRef.current = tileLayer;

        // Initialize Layer Groups
        zonesLayerRef.current = L.featureGroup().addTo(map);
        routesLayerRef.current = L.featureGroup().addTo(map);
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

  // 2. Map Style Switcher (Google Streets, Satellite, Terrain, Uber Midnight)
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (activeTileLayerRef.current) {
        map.removeLayer(activeTileLayerRef.current);
      }
      if (referenceTileLayerRef.current) {
        map.removeLayer(referenceTileLayerRef.current);
        referenceTileLayerRef.current = null;
      }

      const cfg = TILE_CONFIGS[mapStyle];
      const newTile = L.tileLayer(cfg.url, {
        subdomains: cfg.subdomains || ["a", "b", "c"],
        attribution: cfg.attribution,
        maxZoom: cfg.maxZoom,
      }).addTo(map);

      activeTileLayerRef.current = newTile;

      // Add reference overlay for Midnight theme
      if (mapStyle === "uber_midnight") {
        const refTile = L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          { attribution: "", maxZoom: 18 }
        ).addTo(map);
        referenceTileLayerRef.current = refTile;
      }
    });
  }, [mapStyle]);

  // 3. Helper to generate realistic top-down SVG car icon
  const getCarSvg = (driver: Driver, isSelected: boolean) => {
    const isEnRoute = driver.status === "EN_ROUTE_SURGE";
    const isOnTrip = driver.status === "ON_TRIP";

    let bodyFill = "#18181b"; // default dark obsidian
    let trimColor = "#6366f1"; // indigo
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
      // Iconic yellow and green Bengaluru auto
      bodyFill = "#ca8a04";
      trimColor = "#15803d";
      headlightColor = "#fef08a";
    }

    if (isSelected) {
      trimColor = "#ffffff";
    }

    // Status indicator glow dot
    const statusGlow = isEnRoute
      ? "filter: drop-shadow(0 0 6px #06b6d4);"
      : isOnTrip
      ? "filter: drop-shadow(0 0 6px #8b5cf6);"
      : "filter: drop-shadow(0 0 5px #10b981);";

    return `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125" style="transform: rotate(${driver.heading || 0}deg); ${statusGlow}">
        <svg viewBox="0 0 24 38" width="20" height="34" class="drop-shadow-md">
          <!-- Main Chassis -->
          <rect x="2" y="3" width="20" height="32" rx="5" fill="${bodyFill}" stroke="${trimColor}" stroke-width="${isSelected ? '2.5' : '1.5'}"/>
          <!-- Front Windshield -->
          <path d="M4 12 Q12 9 20 12 L18 17 Q12 16 6 17 Z" fill="#38bdf8" fill-opacity="0.85"/>
          <!-- Sunroof / Roof -->
          <rect x="5.5" y="19" width="13" height="7" rx="2" fill="${trimColor}" fill-opacity="0.4"/>
          <!-- Rear Windshield -->
          <path d="M5.5 28 Q12 29 18.5 28 L18 31 Q12 32 6 31 Z" fill="#38bdf8" fill-opacity="0.7"/>
          <!-- Dual Headlights -->
          <circle cx="5" cy="4" r="1.5" fill="${headlightColor}"/>
          <circle cx="19" cy="4" r="1.5" fill="${headlightColor}"/>
          <!-- Taillights -->
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
      if (!map || !zonesLayer || !routesLayer || !markersLayer) return;

      // A. Zones with Glowing Surge Multipliers
      zonesLayer.clearLayers();
      Object.values(state.zones).forEach((zone) => {
        const isSelected = selectedZone === zone.id;
        const isHighSurge = zone.surgeMultiplier >= 2.0;
        const isSevereSurge = zone.surgeMultiplier >= 3.0;

        const color = isSevereSurge ? "#ef4444" : isHighSurge ? "#f59e0b" : "#10b981";

        // Surge radius circle
        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radiusMeters,
          color,
          weight: isSelected ? 3 : 1.5,
          fillColor: color,
          fillOpacity: isSevereSurge ? 0.32 : isHighSurge ? 0.22 : 0.12,
          dashArray: isSelected ? "4, 6" : undefined,
        }).addTo(zonesLayer);

        circle.on("click", () => onSelectZone(zone.id));

        // Zone Badge Pin
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

      // B. Flood Hazard Zone if Monsoon is Active
      if (state.activeScenario.type === "MONSOON_FLASH_FLOOD") {
        const bellandur = state.zones.TECH_PARK;
        L.circle([bellandur.lat, bellandur.lng], {
          radius: 2200,
          color: "#06b6d4",
          weight: 2,
          fillColor: "#0284c7",
          fillOpacity: 0.35,
          dashArray: "6, 6",
        }).addTo(zonesLayer);
      }

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
              ${driver.vehicleModel} &bull; ${driver.speedKmh || 0} km/h
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
          // Smoothly glide existing marker without re-mounting
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
          // Create marker once
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

  const handleFlyTo = (lat: number, lng: number, zoom: number = 14) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  const selectedDriver = selectedDriverId
    ? state.drivers.find((d) => d.id === selectedDriverId) || null
    : null;

  return (
    <div className="relative w-full h-[560px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Real Leaflet Map Viewport */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Bar: Bengaluru City Fly-To Quick Pills */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-1.5 bg-zinc-950/90 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl max-w-full">
        <button
          onClick={() => handleFlyTo(12.9788, 77.5996, 14)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
        >
          <Zap className="h-3 w-3 text-rose-400" />
          <span>Chinnaswamy Stadium</span>
        </button>
        <button
          onClick={() => handleFlyTo(12.9756, 77.6097, 14)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
        >
          MG Road CBD
        </button>
        <button
          onClick={() => handleFlyTo(13.1986, 77.7066, 13)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
        >
          BLR Airport
        </button>
        <button
          onClick={() => handleFlyTo(12.9260, 77.6762, 13)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
        >
          Bellandur (ORR)
        </button>
      </div>

      {/* Top Right: Real Map Tile Layer Switcher (Google Streets | Google Satellite | Terrain | Midnight) */}
      <div className="absolute top-4 right-14 z-10 flex items-center gap-1 bg-zinc-950/90 backdrop-blur-md p-1 rounded-2xl border border-zinc-800 shadow-xl text-[11px] font-semibold">
        <button
          onClick={() => setMapStyle("google_streets")}
          className={`px-2.5 py-1 rounded-xl transition-all ${
            mapStyle === "google_streets"
              ? "bg-white text-black shadow-sm font-bold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Google Streets
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
          onClick={() => setMapStyle("google_terrain")}
          className={`px-2.5 py-1 rounded-xl transition-all ${
            mapStyle === "google_terrain"
              ? "bg-white text-black shadow-sm font-bold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          Terrain
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

      {/* Floating Bottom Left: Realtime Live Radar Telemetry */}
      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-zinc-800 bg-zinc-950/90 backdrop-blur-md p-3 space-y-2 text-[10px] font-mono shadow-xl">
        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>BENGALURU LIVE RADAR</span>
          </div>
          <span className="text-zinc-400 flex items-center gap-1 font-mono text-[9px]">
            <Clock className="h-3 w-3" />
            <span>{liveClock || "LIVE"} IST</span>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-800">
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
            <span className="text-zinc-300">Trip ({state.drivers.filter((d) => d.status === "ON_TRIP").length})</span>
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
                  {selectedDriver.licensePlate} &bull; {selectedDriver.vehicleType.replace("UBER_", "")}
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

          {/* Live Speed & Fuel/Battery Metrics */}
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

          {/* Shift stats */}
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