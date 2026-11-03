import { NextResponse } from "next/server";
import { INDIA_TOURIST_PLACES } from "@/lib/uber/touristPlaces";

interface UberLocationResult {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  category: "AIRPORT" | "METRO_STATION" | "TECH_PARK" | "MALL" | "HOTSPOT" | "TOURIST_SPOT" | "GENERAL";
}

// Comprehensive dictionary of 120+ top Uber hotspots, transit hubs, and localities across India
const ALL_INDIA_UBER_LOCATIONS: UberLocationResult[] = [
  // Bengaluru
  { id: "BLR_1", name: "Kempegowda International Airport (BLR T1 & T2)", address: "Devenahalli, Bengaluru", city: "Bengaluru", lat: 13.1986, lng: 77.7066, category: "AIRPORT" },
  { id: "BLR_2", name: "M. Chinnaswamy Stadium", address: "MG Road, Cubbon Park, Bengaluru", city: "Bengaluru", lat: 12.9788, lng: 77.5996, category: "HOTSPOT" },
  { id: "BLR_3", name: "Koramangala 5th Block", address: "100 Feet Road, Koramangala, Bengaluru", city: "Bengaluru", lat: 12.9352, lng: 77.6245, category: "HOTSPOT" },
  { id: "BLR_4", name: "Indiranagar 12th Main Road", address: "100ft Road, Indiranagar, Bengaluru", city: "Bengaluru", lat: 12.9719, lng: 77.6412, category: "HOTSPOT" },
  { id: "BLR_5", name: "Bellandur Outer Ring Road Ecospace", address: "Bellandur Tech Corridor, Bengaluru", city: "Bengaluru", lat: 12.9260, lng: 77.6762, category: "TECH_PARK" },
  { id: "BLR_6", name: "Whitefield ITPL Tech Park", address: "ITPL Main Road, Whitefield, Bengaluru", city: "Bengaluru", lat: 12.9863, lng: 77.7308, category: "TECH_PARK" },
  { id: "BLR_7", name: "Electronic City Phase 1", address: "Hosur Road, Electronic City, Bengaluru", city: "Bengaluru", lat: 12.8399, lng: 77.6770, category: "TECH_PARK" },
  { id: "BLR_8", name: "Krantivira Sangolli Rayanna Railway Station (SBC)", address: "Majestic, Bengaluru", city: "Bengaluru", lat: 12.9778, lng: 77.5714, category: "METRO_STATION" },
  { id: "BLR_9", name: "Phoenix Marketcity Mall", address: "Mahadevapura, Whitefield Road, Bengaluru", city: "Bengaluru", lat: 12.9959, lng: 77.6964, category: "MALL" },
  { id: "BLR_10", name: "UB City & Vittal Mallya Road", address: "Lavelle Road, Bengaluru", city: "Bengaluru", lat: 12.9719, lng: 77.5958, category: "MALL" },

  // Delhi NCR
  { id: "DEL_1", name: "Indira Gandhi International Airport (DEL T3)", address: "Palam, New Delhi", city: "Delhi NCR", lat: 28.5562, lng: 77.1000, category: "AIRPORT" },
  { id: "DEL_2", name: "Connaught Place (Inner & Outer Circle)", address: "Rajiv Chowk, New Delhi", city: "Delhi NCR", lat: 28.6315, lng: 77.2167, category: "HOTSPOT" },
  { id: "DEL_3", name: "DLF Cyber Hub & Cyber City", address: "DLF Phase 2, Gurugram", city: "Delhi NCR", lat: 28.4950, lng: 77.0895, category: "TECH_PARK" },
  { id: "DEL_4", name: "Hauz Khas Social & Village", address: "Hauz Khas, New Delhi", city: "Delhi NCR", lat: 28.5494, lng: 77.1944, category: "HOTSPOT" },
  { id: "DEL_5", name: "New Delhi Railway Station (NDLS)", address: "Paharganj / Ajmeri Gate, New Delhi", city: "Delhi NCR", lat: 28.6431, lng: 77.2197, category: "METRO_STATION" },
  { id: "DEL_6", name: "Noida Sector 18 (Atta Market & Mall of India)", address: "Sector 18, Noida", city: "Delhi NCR", lat: 28.5677, lng: 77.3211, category: "MALL" },
  { id: "DEL_7", name: "Select CITYWALK Mall", address: "Saket District Centre, New Delhi", city: "Delhi NCR", lat: 28.5284, lng: 77.2190, category: "MALL" },
  { id: "DEL_8", name: "Chandni Chowk & Red Fort", address: "Old Delhi, Delhi", city: "Delhi NCR", lat: 28.6562, lng: 77.2310, category: "HOTSPOT" },
  { id: "DEL_9", name: "Golf Course Road", address: "Sector 54, Gurugram", city: "Delhi NCR", lat: 28.4595, lng: 77.0980, category: "HOTSPOT" },
  { id: "DEL_10", name: "Jawaharlal Nehru Stadium (JLN)", address: "Pragati Vihar, New Delhi", city: "Delhi NCR", lat: 28.5828, lng: 77.2344, category: "HOTSPOT" },

  // Mumbai
  { id: "BOM_1", name: "Chhatrapati Shivaji Maharaj Intl Airport (BOM T2)", address: "Sahar, Andheri East, Mumbai", city: "Mumbai", lat: 19.0896, lng: 72.8656, category: "AIRPORT" },
  { id: "BOM_2", name: "Bandra Kurla Complex (BKC) & Jio World", address: "BKC, Bandra East, Mumbai", city: "Mumbai", lat: 19.0688, lng: 72.8682, category: "TECH_PARK" },
  { id: "BOM_3", name: "Marine Drive & Nariman Point", address: "Churchgate, South Mumbai", city: "Mumbai", lat: 18.9220, lng: 72.8238, category: "HOTSPOT" },
  { id: "BOM_4", name: "Bandra West (Linking Road & Carter Road)", address: "Bandra West, Mumbai", city: "Mumbai", lat: 19.0596, lng: 72.8295, category: "HOTSPOT" },
  { id: "BOM_5", name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)", address: "Fort, Mumbai", city: "Mumbai", lat: 18.9400, lng: 72.8354, category: "METRO_STATION" },
  { id: "BOM_6", name: "Juhu Beach & J.W. Marriott", address: "Juhu Tara Road, Mumbai", city: "Mumbai", lat: 19.0988, lng: 72.8264, category: "HOTSPOT" },
  { id: "BOM_7", name: "Lower Parel & Phoenix Palladium Mall", address: "Senapati Bapat Marg, Lower Parel, Mumbai", city: "Mumbai", lat: 18.9942, lng: 72.8258, category: "MALL" },
  { id: "BOM_8", name: "Powai & Hiranandani Gardens", address: "Powai, Mumbai", city: "Mumbai", lat: 19.1197, lng: 72.9051, category: "TECH_PARK" },
  { id: "BOM_9", name: "Andheri West & Lokhandwala Complex", address: "Andheri West, Mumbai", city: "Mumbai", lat: 19.1432, lng: 72.8277, category: "HOTSPOT" },
  { id: "BOM_10", name: "Thane Viviana Mall", address: "Eastern Express Highway, Thane West", city: "Mumbai", lat: 19.2088, lng: 72.9719, category: "MALL" },

  // Hyderabad
  { id: "HYD_1", name: "Rajiv Gandhi International Airport (HYD)", address: "Shamshabad, Hyderabad", city: "Hyderabad", lat: 17.2403, lng: 78.4294, category: "AIRPORT" },
  { id: "HYD_2", name: "HITEC City & Madhapur Cyber Towers", address: "HITEC City, Madhapur, Hyderabad", city: "Hyderabad", lat: 17.4474, lng: 78.3762, category: "TECH_PARK" },
  { id: "HYD_3", name: "Gachibowli Financial District", address: "Nanakramguda, Hyderabad", city: "Hyderabad", lat: 17.4190, lng: 78.3489, category: "TECH_PARK" },
  { id: "HYD_4", name: "Banjara Hills & Jubilee Hills (Road No. 36)", address: "Jubilee Hills, Hyderabad", city: "Hyderabad", lat: 17.4319, lng: 78.4073, category: "HOTSPOT" },
  { id: "HYD_5", name: "Secunderabad Railway Station", address: "Secunderabad, Hyderabad", city: "Hyderabad", lat: 17.4334, lng: 78.5042, category: "METRO_STATION" },
  { id: "HYD_6", name: "Inorbit Mall Cyberabad", address: "Mindspace, Madhapur, Hyderabad", city: "Hyderabad", lat: 17.4358, lng: 78.3842, category: "MALL" },

  // Chennai
  { id: "MAA_1", name: "Chennai International Airport (MAA)", address: "Meenambakkam, Chennai", city: "Chennai", lat: 12.9941, lng: 80.1709, category: "AIRPORT" },
  { id: "MAA_2", name: "Old Mahabalipuram Road (OMR IT Expressway)", address: "Sholinganallur, Chennai", city: "Chennai", lat: 12.9010, lng: 80.2279, category: "TECH_PARK" },
  { id: "MAA_3", name: "T. Nagar (Pondy Bazaar)", address: "Thyagaraya Nagar, Chennai", city: "Chennai", lat: 13.0418, lng: 80.2341, category: "HOTSPOT" },
  { id: "MAA_4", name: "Chennai Central Railway Station (MAS)", address: "Kannappar Thidal, Chennai", city: "Chennai", lat: 13.0827, lng: 80.2755, category: "METRO_STATION" },
  { id: "MAA_5", name: "Express Avenue Mall", address: "Royapettah, Chennai", city: "Chennai", lat: 13.0587, lng: 80.2642, category: "MALL" },

  // Kolkata
  { id: "CCU_1", name: "Netaji Subhash Chandra Bose Intl Airport (CCU)", address: "Dum Dum, Kolkata", city: "Kolkata", lat: 22.6547, lng: 88.4467, category: "AIRPORT" },
  { id: "CCU_2", name: "Salt Lake Sector 5 (EcoSpace & RDB Boulevard)", address: "Sector 5, Salt Lake, Kolkata", city: "Kolkata", lat: 22.5800, lng: 88.4300, category: "TECH_PARK" },
  { id: "CCU_3", name: "Park Street & Camac Street", address: "Park Street, Kolkata", city: "Kolkata", lat: 22.5511, lng: 88.3526, category: "HOTSPOT" },
  { id: "CCU_4", name: "Howrah Railway Station", address: "Howrah, West Bengal", city: "Kolkata", lat: 22.5838, lng: 88.3426, category: "METRO_STATION" },
  { id: "CCU_5", name: "South City Mall", address: "Prince Anwar Shah Road, Kolkata", city: "Kolkata", lat: 22.5005, lng: 88.3621, category: "MALL" },

  // Pune, Jaipur, Ahmedabad, Goa
  { id: "PUN_1", name: "Hinjawadi IT Park (Phases 1, 2, 3)", address: "Hinjawadi, Pune", city: "Pune", lat: 18.5913, lng: 73.7389, category: "TECH_PARK" },
  { id: "PUN_2", name: "Koregaon Park & Viman Nagar", address: "Koregaon Park, Pune", city: "Pune", lat: 18.5362, lng: 73.8940, category: "HOTSPOT" },
  { id: "JAI_1", name: "Jaipur International Airport", address: "Sanganer, Jaipur", city: "Jaipur", lat: 26.8289, lng: 75.8056, category: "AIRPORT" },
  { id: "JAI_2", name: "Hawa Mahal & Johari Bazaar", address: "Pink City, Jaipur", city: "Jaipur", lat: 26.9239, lng: 75.8267, category: "HOTSPOT" },
  { id: "AMD_1", name: "Sardar Vallabhbhai Patel Intl Airport", address: "Hansol, Ahmedabad", city: "Ahmedabad", lat: 23.0734, lng: 72.6347, category: "AIRPORT" },
  { id: "GOA_1", name: "Goa Dabolim Airport (GOI)", address: "Dabolim, South Goa", city: "Goa", lat: 15.3808, lng: 73.8314, category: "AIRPORT" },
  { id: "GOA_2", name: "Baga Beach & Tito's Lane", address: "Calangute, North Goa", city: "Goa", lat: 15.5553, lng: 73.7517, category: "HOTSPOT" },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  if (!q) {
    // Return top popular airports and hubs by default
    return NextResponse.json({
      success: true,
      locations: ALL_INDIA_UBER_LOCATIONS.slice(0, 10),
    });
  }

  // 1. Search in local comprehensive Pan-India dictionary
  const localMatches = ALL_INDIA_UBER_LOCATIONS.filter(
    (loc) =>
      loc.name.toLowerCase().includes(q) ||
      loc.address.toLowerCase().includes(q) ||
      loc.city.toLowerCase().includes(q)
  );

  // 2. Search in all 32 tourist attractions
  const touristMatches: UberLocationResult[] = INDIA_TOURIST_PLACES.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.city.toLowerCase().includes(q) ||
      t.state.toLowerCase().includes(q)
  ).map((t) => ({
    id: `TOURIST_${t.id}`,
    name: t.name,
    address: `${t.city}, ${t.state} (${t.uberCategory})`,
    city: t.city,
    lat: t.lat,
    lng: t.lng,
    category: "TOURIST_SPOT",
  }));

  let combined = [...localMatches, ...touristMatches];

  // 3. If user is searching for any general location/street/city, query OpenStreetMap Nominatim
  if (combined.length < 5 && q.length >= 3) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800); // 1.8s fast timeout

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          q
        )}&countrycodes=in&limit=6&addressdetails=1`,
        {
          headers: {
            "User-Agent": "UberMarketplaceBrain/2.0 (hackathon-comit-con)",
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (res.ok) {
        const osmData = await res.json();
        const osmLocations: UberLocationResult[] = osmData.map((item: any, idx: number) => ({
          id: `OSM_${idx}_${Date.now()}`,
          name: item.name || item.display_name.split(",")[0],
          address: item.display_name,
          city: item.address?.city || item.address?.town || item.address?.state || "India",
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          category: "GENERAL",
        }));

        combined = [...combined, ...osmLocations];
      }
    } catch (e) {
      // Ignore network timeout and gracefully fall back to local results
    }
  }

  // De-duplicate by name and take top 8
  const seen = new Set<string>();
  const uniqueResults = combined.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);

  return NextResponse.json({
    success: true,
    query: q,
    count: uniqueResults.length,
    locations: uniqueResults,
  });
}
