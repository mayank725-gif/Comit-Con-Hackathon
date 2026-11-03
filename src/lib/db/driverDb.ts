import fs from "fs";
import path from "path";

export interface DriverUser {
  id: string;
  googleId: string;
  email: string;
  name: string;
  avatar: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface DriverWorkProfile {
  userId: string;
  driverName: string;
  phone: string;
  city: "DELHI" | "BENGALURU" | "MUMBAI" | "HYDERABAD" | "CHENNAI" | "KOLKATA";
  cityName: string;
  primaryZone: string;
  primaryZoneName: string;
  vehicleType: "UBER_GO" | "UBER_PREMIER" | "UBER_AUTO" | "UBER_GREEN_EV";
  vehicleModel: string;
  licensePlate: string;
  willingOutstation: boolean;
  dailyEarningsTarget: number;
  currentEarnings: number;
  completedTrips: number;
  shiftHours: number;
  isOnDuty: boolean;
  assignedCoordinates: [number, number]; // [lat, lng]
  updatedAt: string;
}

export interface DriverSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface DriverTripLog {
  id: string;
  userId: string;
  pickupZone: string;
  dropZone: string;
  fareInr: number;
  surgeMultiplier: number;
  distanceKm: number;
  durationMin: number;
  timestamp: string;
}

interface DatabaseSchema {
  users: Record<string, DriverUser>;
  profiles: Record<string, DriverWorkProfile>;
  sessions: Record<string, DriverSession>;
  trips: DriverTripLog[];
}

/**
 * Enterprise Custom Embedded Document Database Engine
 * Zero external cloud dependencies - 100% self-contained
 */
class CustomDriverDatabase {
  private inMemoryDb: DatabaseSchema;
  private dbFilePath: string;
  private isPersisting: boolean = false;

  constructor() {
    // Primary storage file location
    const storageDir = process.env.DATA_DIR || path.join(process.cwd(), ".data");
    this.dbFilePath = path.join(storageDir, "uber_driver_database.json");

    // Initialize database (empty users & profiles - authenticated via Firebase)
    this.inMemoryDb = {
      users: {},
      profiles: {},
      sessions: {},
      trips: [],
    };

    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.users && parsed.profiles) {
          this.inMemoryDb = {
            users: { ...this.inMemoryDb.users, ...parsed.users },
            profiles: { ...this.inMemoryDb.profiles, ...parsed.profiles },
            sessions: { ...this.inMemoryDb.sessions, ...parsed.sessions },
            trips: parsed.trips || [],
          };
        }
      }
    } catch (e) {
      console.warn("CustomDriverDatabase: Non-fatal load warning, using memory state:", e);
    }
  }

  private async persistToDisk() {
    if (this.isPersisting) return;
    this.isPersisting = true;
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.inMemoryDb, null, 2), "utf-8");
    } catch (e) {
      // In serverless read-only contexts, in-memory state persists per invocation
      console.warn("CustomDriverDatabase: Disk persist note:", e);
    } finally {
      this.isPersisting = false;
    }
  }

  // --- USER OPERATIONS ---
  public async findUserByGoogleId(googleId: string): Promise<DriverUser | null> {
    for (const u of Object.values(this.inMemoryDb.users)) {
      if (u.googleId === googleId) return u;
    }
    return null;
  }

  public async findUserByEmail(email: string): Promise<DriverUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    for (const u of Object.values(this.inMemoryDb.users)) {
      if (u.email.toLowerCase().trim() === cleanEmail) return u;
    }
    return null;
  }

  public async findUserById(userId: string): Promise<DriverUser | null> {
    return this.inMemoryDb.users[userId] || null;
  }

  public async createOrUpdateGoogleUser(params: {
    googleId: string;
    email: string;
    name: string;
    avatar?: string;
  }): Promise<DriverUser> {
    let existing = await this.findUserByGoogleId(params.googleId);
    if (!existing) {
      existing = await this.findUserByEmail(params.email);
    }

    const now = new Date().toISOString();

    if (existing) {
      existing.lastLoginAt = now;
      if (params.name) existing.name = params.name;
      if (params.avatar) existing.avatar = params.avatar;
      this.inMemoryDb.users[existing.id] = existing;
      await this.persistToDisk();
      return existing;
    }

    const newId = `USR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      params.name
    )}&backgroundColor=00d2ff,9d4edd`;

    const newUser: DriverUser = {
      id: newId,
      googleId: params.googleId,
      email: params.email,
      name: params.name,
      avatar: params.avatar || defaultAvatar,
      createdAt: now,
      lastLoginAt: now,
    };

    this.inMemoryDb.users[newId] = newUser;
    await this.persistToDisk();
    return newUser;
  }

  // --- PROFILE OPERATIONS ---
  public async getProfile(userId: string): Promise<DriverWorkProfile | null> {
    return this.inMemoryDb.profiles[userId] || null;
  }

  public async upsertProfile(
    userId: string,
    profileData: Partial<DriverWorkProfile>
  ): Promise<DriverWorkProfile> {
    const user = await this.findUserById(userId);
    const existing = this.inMemoryDb.profiles[userId];
    const now = new Date().toISOString();

    const coordinatesByZone: Record<string, [number, number]> = {
      STADIUM: [12.9788, 77.5980], // Chinnaswamy, Bengaluru
      DOWNTOWN: [12.9756, 77.6097], // MG Road
      AIRPORT: [13.1986, 77.7066], // BLR Airport
      TECH_PARK: [12.9279, 77.6834], // Bellandur ORR
      DELHI_CENTRAL: [28.5828, 77.2344], // JLN Stadium
      DELHI_CYBER: [28.4900, 77.0900], // Cyber City
      DELHI_AIRPORT: [28.5562, 77.1000], // IGI Airport
      MUMBAI_BKC: [19.0657, 72.8680], // BKC
      MUMBAI_SOUTH: [18.9220, 72.8347], // Nariman Point
      MUMBAI_AIRPORT: [19.0896, 72.8656], // BOM Airport
      HYDERABAD_HITEC: [17.4474, 78.3762], // HITEC City
      CHENNAI_OMR: [12.9800, 80.2200], // OMR
      KOLKATA_SALTLAKE: [22.5726, 88.3639], // Salt Lake
    };

    const targetZone = profileData.primaryZone || existing?.primaryZone || "STADIUM";
    const coords = coordinatesByZone[targetZone] || [12.9788, 77.5980];

    const updatedProfile: DriverWorkProfile = {
      userId,
      driverName: profileData.driverName || user?.name || existing?.driverName || "Driver",
      phone: profileData.phone || existing?.phone || "+91 98000 00000",
      city: profileData.city || existing?.city || "BENGALURU",
      cityName: profileData.cityName || existing?.cityName || "Bengaluru",
      primaryZone: targetZone,
      primaryZoneName: profileData.primaryZoneName || existing?.primaryZoneName || "Central Hub",
      vehicleType: profileData.vehicleType || existing?.vehicleType || "UBER_GO",
      vehicleModel: profileData.vehicleModel || existing?.vehicleModel || "Maruti Suzuki Dzire",
      licensePlate: profileData.licensePlate || existing?.licensePlate || "KA 01 AB 1234",
      willingOutstation: profileData.willingOutstation !== undefined ? profileData.willingOutstation : (existing?.willingOutstation ?? true),
      dailyEarningsTarget: profileData.dailyEarningsTarget || existing?.dailyEarningsTarget || 2500,
      currentEarnings: existing?.currentEarnings || 1480,
      completedTrips: existing?.completedTrips || 5,
      shiftHours: existing?.shiftHours || 3.5,
      isOnDuty: profileData.isOnDuty !== undefined ? profileData.isOnDuty : (existing?.isOnDuty ?? true),
      assignedCoordinates: coords,
      updatedAt: now,
    };

    this.inMemoryDb.profiles[userId] = updatedProfile;
    await this.persistToDisk();
    return updatedProfile;
  }

  // --- SESSION OPERATIONS ---
  public async createSession(userId: string): Promise<DriverSession> {
    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const createdAt = new Date().toISOString();
    // 30 days validity
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const session: DriverSession = {
      token,
      userId,
      createdAt,
      expiresAt,
    };

    this.inMemoryDb.sessions[token] = session;
    await this.persistToDisk();
    return session;
  }

  public async getSession(token: string): Promise<DriverSession | null> {
    const sess = this.inMemoryDb.sessions[token];
    if (!sess) return null;
    if (new Date(sess.expiresAt).getTime() < Date.now()) {
      delete this.inMemoryDb.sessions[token];
      return null;
    }
    return sess;
  }

  public async deleteSession(token: string): Promise<void> {
    delete this.inMemoryDb.sessions[token];
    await this.persistToDisk();
  }

  // --- SECTOR SPECIFIC STATS ---
  public getSectorTelemetry(city: string, zoneId: string) {
    const sectorStats: Record<string, {
      name: string;
      demandRiders: number;
      surgeMultiplier: number;
      activeDriversCount: number;
      deficitCount: number;
      avgFareInr: number;
      corridorSpeedKmh: number;
      trafficStatus: string;
      recommendedFlyover: string;
    }> = {
      STADIUM: {
        name: "M. Chinnaswamy Stadium & MG Road CBD",
        demandRiders: 280,
        surgeMultiplier: 3.5,
        activeDriversCount: 22,
        deficitCount: 54,
        avgFareInr: 450,
        corridorSpeedKmh: 28,
        trafficStatus: "High event density after cricket match",
        recommendedFlyover: "Queens Road / Cubbon Road bypass",
      },
      TECH_PARK: {
        name: "Bellandur Outer Ring Road Tech Corridor",
        demandRiders: 195,
        surgeMultiplier: 2.8,
        activeDriversCount: 30,
        deficitCount: 38,
        avgFareInr: 520,
        corridorSpeedKmh: 35,
        trafficStatus: "Moderate corporate evening rush",
        recommendedFlyover: "Silk Board Elevated Flyover towards E-City",
      },
      AIRPORT: {
        name: "Kempegowda International Airport Corridor",
        demandRiders: 160,
        surgeMultiplier: 2.2,
        activeDriversCount: 42,
        deficitCount: 20,
        avgFareInr: 1250,
        corridorSpeedKmh: 58,
        trafficStatus: "Smooth flow on Hebbal Expressway",
        recommendedFlyover: "Airport Trumpet Flyover direct exit",
      },
      DELHI_CENTRAL: {
        name: "JLN Stadium & Connaught Place",
        demandRiders: 240,
        surgeMultiplier: 3.2,
        activeDriversCount: 26,
        deficitCount: 46,
        avgFareInr: 480,
        corridorSpeedKmh: 32,
        trafficStatus: "High evening rush along Barakhamba & Lodhi",
        recommendedFlyover: "Bhisham Pitamah Marg corridor",
      },
      DELHI_CYBER: {
        name: "DLF Cyber City & Golf Course Road (Gurgaon)",
        demandRiders: 210,
        surgeMultiplier: 2.9,
        activeDriversCount: 28,
        deficitCount: 35,
        avgFareInr: 650,
        corridorSpeedKmh: 42,
        trafficStatus: "Peak corporate shift exits",
        recommendedFlyover: "NH-48 elevated highway ramp",
      },
      DELHI_AIRPORT: {
        name: "Indira Gandhi International Airport (DEL T3)",
        demandRiders: 180,
        surgeMultiplier: 2.4,
        activeDriversCount: 38,
        deficitCount: 22,
        avgFareInr: 980,
        corridorSpeedKmh: 55,
        trafficStatus: "Steady terminal egress bank",
        recommendedFlyover: "Aerocity tunnel connector",
      },
      MUMBAI_BKC: {
        name: "Bandra Kurla Complex & Jio Convention (BKC)",
        demandRiders: 310,
        surgeMultiplier: 3.6,
        activeDriversCount: 32,
        deficitCount: 60,
        avgFareInr: 580,
        corridorSpeedKmh: 24,
        trafficStatus: "Heavy corporate junction congestion",
        recommendedFlyover: "BKC-Chunabhatti elevated connector",
      },
      MUMBAI_AIRPORT: {
        name: "Chhatrapati Shivaji Maharaj Airport (BOM T2)",
        demandRiders: 175,
        surgeMultiplier: 2.5,
        activeDriversCount: 36,
        deficitCount: 24,
        avgFareInr: 850,
        corridorSpeedKmh: 45,
        trafficStatus: "Western Express flow active",
        recommendedFlyover: "Sahar elevated airport link",
      },
    };

    return sectorStats[zoneId] || {
      name: zoneId,
      demandRiders: 120,
      surgeMultiplier: 1.8,
      activeDriversCount: 25,
      deficitCount: 15,
      avgFareInr: 380,
      corridorSpeedKmh: 40,
      trafficStatus: "Normal operating conditions",
      recommendedFlyover: "Standard arterial road",
    };
  }
}

// Singleton database instance
export const driverDb = new CustomDriverDatabase();
