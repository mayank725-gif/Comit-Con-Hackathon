"use client";

import React, { useEffect, useRef } from "react";
import { MarketplaceState, ZoneId } from "@/lib/uber/types";
import { Car, Zap, Users, Navigation } from "lucide-react";

interface RealLeafletMapProps {
  state: MarketplaceState;
  selectedZone: ZoneId | null;
  onSelectZone: (zone: ZoneId) => void;
}

export default function RealLeafletMap({
  state,
  selectedZone,
  onSelectZone,
}: RealLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const zonesLayerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically import Leaflet in browser only
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Initialize map once
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [37.735, -122.405],
          zoom: 12,
          minZoom: 10,
          maxZoom: 16,
          zoomControl: false,
        });

        // Add custom zoom control in top right
        L.control.zoom({ position: "topright" }).addTo(map);

        // CartoDB Dark Matter Tile Layer (Industry standard for modern dark-mode transit maps)
        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: "abcd",
            maxZoom: 19,
          }
        ).addTo(map);

        // Create feature groups
        zonesLayerRef.current = L.featureGroup().addTo(map);
        markersLayerRef.current = L.featureGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const zonesLayer = zonesLayerRef.current;
      const markersLayer = markersLayerRef.current;

      if (!map || !zonesLayer || !markersLayer) return;

      // 1. Render Zones with Glowing Surge Circles and Interactive Badges
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

      // 2. Render Moving Vehicles
      markersLayer.clearLayers();

      state.drivers.forEach((driver) => {
        const isEnRoute = driver.status === "EN_ROUTE_SURGE";
        const isOnTrip = driver.status === "ON_TRIP";

        const markerColorClass = isEnRoute
          ? "bg-cyan-400 ring-4 ring-cyan-400/40"
          : isOnTrip
          ? "bg-violet-400 ring-2 ring-violet-400/30"
          : "bg-emerald-400";

        const carHtml = `
          <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group">
            <div class="h-3.5 w-3.5 rounded-full ${markerColorClass} shadow-md transition-all flex items-center justify-center">
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

        carMarker.bindTooltip(
          `<div class="text-xs font-sans"><b>${driver.name}</b><br/>Status: ${driver.status}<br/>Earnings: $${driver.earningsToday}</div>`,
          { className: "custom-leaflet-tooltip", direction: "top", offset: [0, -6] }
        );
      });
    });

    return () => {
      isMounted = false;
    };
  }, [state, selectedZone, onSelectZone]);

  const handleFlyTo = (lat: number, lng: number, zoom: number = 13) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], zoom, { duration: 1.2 });
    }
  };

  return (
    <div className="relative w-full h-[540px] rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
      {/* Real Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating City Navigation Quick-Pills */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800 shadow-xl">
        <button
          onClick={() => handleFlyTo(37.7786, -122.3893, 14)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
        >
          <Zap className="h-3 w-3 text-rose-400" />
          <span>Chase Center (Stadium)</span>
        </button>
        <button
          onClick={() => handleFlyTo(37.7946, -122.4000, 14)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
        >
          Financial District
        </button>
        <button
          onClick={() => handleFlyTo(37.6213, -122.3790, 13)}
          className="px-2.5 py-1 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-1"
        >
          <span>SFO Airport</span>
        </button>
      </div>

      {/* Floating Map Legend */}
      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-zinc-800 bg-zinc-950/85 backdrop-blur-md p-3 space-y-1.5 text-[10px] font-mono shadow-xl">
        <div className="text-[11px] font-bold text-white mb-1">San Francisco Fleet Radar</div>
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
    </div>
  );
}
