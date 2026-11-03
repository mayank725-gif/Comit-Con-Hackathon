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
  AlertTriangle,
  Compass,
} from "lucide-react";

interface RealLeafletMapProps {
  state: MarketplaceState;
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
  onSelectDriverForCopilot?: (driver: Driver) => void;
}

export default function RealLeafletMap({
  state,
  selectedZone,
  onSelectZone,
  onSelectDriverForCopilot,
}: RealLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);
  const routesLayerRef = useRef<any>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet in browser only
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map once centered on Bengaluru, India
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [12.975, 77.63],
          zoom: 12,
          minZoom: 10,
          maxZoom: 16,
          zoomControl: false,
        });

        // Add custom zoom control in top right
        L.control.zoom({ position: "topright" }).addTo(map);

        // Official ESRI World Dark Gray Canvas (Zero Watermark, Zero API Key Required)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Bengaluru Metro Transit Network',
            maxZoom: 16,
          }
        ).addTo(map);

        // ESRI World Dark Gray Reference Layer (Streets, Outer Ring Road & Neighborhoods)
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          {
            attribution: "",
            maxZoom: 16,
          }
        ).addTo(map);

        // Create feature groups
        routesLayerRef.current = L.featureGroup().addTo(map);
        zonesLayerRef.current = L.featureGroup().addTo(map);
        markersLayerRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;

        // Ensure tiles render immediately across full viewport
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
      }

      const map = mapInstanceRef.current;
      const zonesLayer = zonesLayerRef.current;
      const markersLayer = markersLayerRef.current;
      const routesLayer = routesLayerRef.current;

      if (!map || !zonesLayer || !markersLayer || !routesLayer) return;

      // 1. Render Zones with Glowing Surge Circles and Badges
      zonesLayer.clearLayers();

      Object.values(state.zones).forEach((zone) => {
        const isSelected = selectedZone === zone.id;
        const isHighSurge = zone.surgeMultiplier >= 2.0;
        const isSevereSurge = zone.surgeMultiplier >= 3.0;

        const color = isSevereSurge
          ? "#ef4444" // Crimson
          : isHighSurge
          ? "#f59e0b" // Amber
          : "#10b981"; // Emerald

        // Draw zone radius circle
        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radiusMeters,
          color: color,
          weight: isSelected ? 3 : 1.5,
          fillColor: color,
          fillOpacity: isSevereSurge ? 0.35 : isHighSurge ? 0.25 : 0.12,
          dashArray: isSelected ? "4, 6" : undefined,
        }).addTo(zonesLayer);

        circle.on("click", () => onSelectZone(zone.id));

        // Custom DivIcon label for zone
        const labelHtml = `
          <div class="cursor-pointer select-none transition-transform hover:scale-110 -translate-x-1/2 -translate-y-1/2">
            <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
              isSelected
                ? "border-indigo-400 bg-indigo-950/95 ring-2 ring-indigo-400/50"
                : isSevereSurge
                ? "border-rose-500/80 bg-rose-950/95 animate-pulse"
                : isHighSurge
                ? "border-amber-500/80 bg-amber-950/95"
                : "border-zinc-700 bg-zinc-900/95"
            } shadow-lg backdrop-blur-md">
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

      // 2. Render Monsoon Flood Water Hazard Overlay if Active
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

      // 3. Render Route Polylines for Active Drivers
      routesLayer.clearLayers();

      state.drivers.forEach((driver) => {
        if (driver.routeCoordinates && driver.routeCoordinates.length > 1) {
          const isEnRoute = driver.status === "EN_ROUTE_SURGE";
          L.polyline(driver.routeCoordinates, {
            color: isEnRoute ? "#22d3ee" : "#a78bfa",
            weight: 2,
            opacity: 0.65,
            dashArray: "4, 6",
          }).addTo(routesLayer);
        }
      });

      // 4. Render Moving Vehicles
      markersLayer.clearLayers();

      state.drivers.forEach((driver) => {
        const isEnRoute = driver.status === "EN_ROUTE_SURGE";
        const isOnTrip = driver.status === "ON_TRIP";
        const isSelected = selectedDriver?.id === driver.id;

        const markerColorClass = isEnRoute
          ? "bg-cyan-400 ring-4 ring-cyan-400/40"
          : isOnTrip
          ? "bg-violet-400 ring-2 ring-violet-400/30"
          : "bg-emerald-400";

        const carHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125">
            <div class="h-3.5 w-3.5 rounded-full ${markerColorClass} ${
              isSelected ? "ring-4 ring-white" : ""
            } shadow-md flex items-center justify-center">
              <div class="h-1 w-1 rounded-full bg-black"></div>
            </div>
          </div>
        `;

        const carMarker = L.marker([driver.lat, driver.lng], {
          icon: L.divIcon({
            html: carHtml,
            className: "custom-car-marker",
            iconSize: [0, 0],
          }),
        }).addTo(markersLayer);

        carMarker.on("click", () => {
          setSelectedDriver(driver);
        });

        carMarker.bindTooltip(
          `<div class="text-xs font-sans"><b>${driver.name}</b> (${driver.vehicleModel || "Uber Go"})<br/>Status: ${driver.status}<br/>Earnings: ₹${driver.earningsToday}</div>`,
          { className: "custom-leaflet-tooltip", direction: "top", offset: [0, -6] }
        );
      });
    });

    return () => {
      isMounted = false;
    };
  }, [state, selectedZone, onSelectZone, selectedDriver]);

  const handleFlyTo = (lat: number, lng: number, zoom: number = 13) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[540px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating City Navigation Quick-Pills for Bengaluru, India */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-1.5 bg-zinc-950/85 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl max-w-full">
        <button
          onClick={() => handleFlyTo(12.9788, 77.5996, 14)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
        >
          <Zap className="h-3 w-3 text-rose-400" />
          <span>Stadium</span>
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
          Tech Park (ORR)
        </button>
      </div>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-zinc-800 bg-zinc-950/85 backdrop-blur-md p-3 space-y-1.5 text-[10px] font-mono shadow-xl">
        <div className="text-[11px] font-bold text-white mb-1">Bengaluru Fleet Radar (India)</div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-zinc-300">Available ({state.drivers.filter(d => d.status === "IDLE").length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-zinc-300">En Route to Surge ({state.drivers.filter(d => d.status === "EN_ROUTE_SURGE").length})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-violet-400" />
          <span className="text-zinc-300">On Active Trip ({state.drivers.filter(d => d.status === "ON_TRIP").length})</span>
        </div>
      </div>

      {/* Active Scenario Banner */}
      {state.activeScenario.active && state.activeScenario.type !== "NORMAL" && (
        <div className="absolute top-16 left-4 z-10 max-w-md rounded-2xl border border-amber-500/40 bg-zinc-950/95 backdrop-blur-md p-3.5 space-y-1 shadow-2xl">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold text-amber-300">
              {state.activeScenario.title}
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-snug">
            {state.activeScenario.description}
          </p>
        </div>
      )}

      {/* Floating Selected Driver Card (Glassmorphism Popup) */}
      {selectedDriver && (
        <div className="absolute bottom-4 right-4 z-20 w-80 rounded-2xl border border-indigo-500/40 bg-zinc-950/95 backdrop-blur-xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-xs">
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
                  {selectedDriver.licensePlate || "KA 01 MJ 1042"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Vehicle & Battery/Fuel details */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2">
              <span className="text-zinc-500 block mb-0.5">Vehicle Type</span>
              <span className="text-white font-bold block truncate">
                {selectedDriver.vehicleType?.replace("UBER_", "") || "GO"}
              </span>
              <span className="text-zinc-400 text-[9px] truncate block">
                {selectedDriver.vehicleModel || "Maruti Suzuki"}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2">
              <span className="text-zinc-500 block mb-0.5 flex items-center gap-1">
                {selectedDriver.vehicleType === "UBER_GREEN_EV" ? (
                  <BatteryCharging className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Fuel className="h-3 w-3 text-amber-400" />
                )}
                <span>Level</span>
              </span>
              <span className="text-emerald-400 font-bold block">
                {selectedDriver.batteryOrFuelPercent || 78}%
              </span>
              <span className="text-zinc-400 text-[9px]">
                {selectedDriver.vehicleType === "UBER_GREEN_EV" ? "Battery Max" : "Fuel Tank"}
              </span>
            </div>
          </div>

          {/* Shift stats */}
          <div className="flex items-center justify-between pt-1 border-t border-zinc-800 text-[10px] font-mono">
            <div>
              <span className="text-zinc-500">Earnings Today: </span>
              <span className="text-white font-bold">₹{selectedDriver.earningsToday}</span>
            </div>
            <div>
              <span className="text-zinc-500">Status: </span>
              <span className="text-cyan-400 font-bold">{selectedDriver.status}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}