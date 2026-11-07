// Isochrone Reachability & Real-Time Demand Heatmap Engine
// Generates 5, 10, and 15-minute reachability contours and spatial density nodes

import { IsochroneZone } from "./types";

export interface DemandHeatmapNode {
  id: string;
  name: string;
  city: string;
  coords: [number, number];
  intensity: number; // 0.0 to 1.0
  radiusMeters: number;
  surgeLevel: number;
}

export const METRO_HEATMAP_NODES: DemandHeatmapNode[] = [
  // Bengaluru
  {
    id: "HEAT_BLR_STADIUM",
    name: "M. Chinnaswamy Stadium & MG Road",
    city: "Bengaluru",
    coords: [12.9788, 77.5996],
    intensity: 0.95,
    radiusMeters: 1400,
    surgeLevel: 3.5,
  },
  {
    id: "HEAT_BLR_AIRPORT",
    name: "Kempegowda Int'l Airport Terminal 1 & 2",
    city: "Bengaluru",
    coords: [13.1986, 77.7066],
    intensity: 0.88,
    radiusMeters: 2200,
    surgeLevel: 2.8,
  },
  {
    id: "HEAT_BLR_KORAMANGALA",
    name: "Koramangala 80ft Road & Sony World",
    city: "Bengaluru",
    coords: [12.9352, 77.6245],
    intensity: 0.78,
    radiusMeters: 1200,
    surgeLevel: 2.2,
  },
  {
    id: "HEAT_BLR_BELLANDUR",
    name: "Bellandur EcoSpace Outer Ring Road",
    city: "Bengaluru",
    coords: [12.9260, 77.6762],
    intensity: 0.92,
    radiusMeters: 1600,
    surgeLevel: 3.1,
  },
  // Delhi NCR
  {
    id: "HEAT_DEL_CONNAUGHT",
    name: "Connaught Place Inner & Outer Circle",
    city: "Delhi NCR",
    coords: [28.6315, 77.2167],
    intensity: 0.9,
    radiusMeters: 1500,
    surgeLevel: 2.9,
  },
  {
    id: "HEAT_DEL_AIRPORT_T3",
    name: "IGI Airport T3 Arrivals",
    city: "Delhi NCR",
    coords: [28.5562, 77.1000],
    intensity: 0.89,
    radiusMeters: 2000,
    surgeLevel: 2.7,
  },
  {
    id: "HEAT_DEL_CYBERHUB",
    name: "DLF Cyber Hub Gurugram",
    city: "Delhi NCR",
    coords: [28.4950, 77.0895],
    intensity: 0.94,
    radiusMeters: 1800,
    surgeLevel: 3.2,
  },
  // Mumbai
  {
    id: "HEAT_MUM_BKC",
    name: "BKC Commercial Complex & Jio World",
    city: "Mumbai",
    coords: [19.0657, 72.8688],
    intensity: 0.96,
    radiusMeters: 1600,
    surgeLevel: 3.4,
  },
  {
    id: "HEAT_MUM_AIRPORT",
    name: "Chhatrapati Shivaji Maharaj Int'l Airport T2",
    city: "Mumbai",
    coords: [19.0974, 72.8744],
    intensity: 0.87,
    radiusMeters: 1800,
    surgeLevel: 2.6,
  },
  // Hyderabad
  {
    id: "HEAT_HYD_HITEC",
    name: "HITEC City & Cyber Towers",
    city: "Hyderabad",
    coords: [17.4474, 78.3762],
    intensity: 0.91,
    radiusMeters: 1600,
    surgeLevel: 2.9,
  },
];

export class IsochroneEngine {
  // Generates 5m, 10m, and 15m non-uniform reachability polygons around a center point
  // Stretches along expressway angles for realistic traffic modeling
  generateIsochrones(center: [number, number]): IsochroneZone[] {
    const [cLat, cLng] = center;

    // Speeds: 5min ~ 2.5km, 10min ~ 5.5km, 15min ~ 9km
    const rings: Array<{
      minutes: 5 | 10 | 15;
      baseRadiusKm: number;
      label: string;
      color: string;
      fillColor: string;
    }> = [
      {
        minutes: 5,
        baseRadiusKm: 2.2,
        label: "5 min reach",
        color: "#22c55e",
        fillColor: "#22c55e",
      },
      {
        minutes: 10,
        baseRadiusKm: 5.0,
        label: "10 min reach",
        color: "#eab308",
        fillColor: "#eab308",
      },
      {
        minutes: 15,
        baseRadiusKm: 8.8,
        label: "15 min reach",
        color: "#3b82f6",
        fillColor: "#3b82f6",
      },
    ];

    const numPoints = 24;

    return rings.map((ring) => {
      const polygonCoords: [number, number][] = [];

      for (let i = 0; i < numPoints; i++) {
        const angle = (i * 360) / numPoints;
        const rad = (angle * Math.PI) / 180;

        // Arterial elongation factor: roads heading along cardinal/intercardinal directions move faster
        const arterialStretch =
          1.0 +
          0.35 * Math.sin(rad * 4) +
          0.15 * Math.cos(rad * 2 + 0.5);

        const radiusKm = ring.baseRadiusKm * arterialStretch;

        // Convert km to approximate latitude & longitude offsets
        const dLat = (radiusKm * Math.cos(rad)) / 110.574;
        const dLng =
          (radiusKm * Math.sin(rad)) /
          (111.32 * Math.cos((cLat * Math.PI) / 180));

        polygonCoords.push([+(cLat + dLat).toFixed(6), +(cLng + dLng).toFixed(6)]);
      }

      // Close polygon loop
      polygonCoords.push(polygonCoords[0]);

      return {
        minutes: ring.minutes,
        label: ring.label,
        color: ring.color,
        fillColor: ring.fillColor,
        coords: polygonCoords,
      };
    });
  }

  // Returns demand heat nodes filtered by city
  getHeatmapNodes(cityFilter?: string): DemandHeatmapNode[] {
    if (!cityFilter || cityFilter === "ALL" || cityFilter === "INDIA") {
      return METRO_HEATMAP_NODES;
    }
    return METRO_HEATMAP_NODES.filter((n) =>
      n.city.toLowerCase().includes(cityFilter.toLowerCase())
    );
  }
}

export const isochroneEngine = new IsochroneEngine();
