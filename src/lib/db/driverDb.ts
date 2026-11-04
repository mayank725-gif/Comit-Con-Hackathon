import fs from "fs";
import path from "path";
import {
  CityZone,
  Driver,
  RideRequest,
  SurgeHandlingRequest,
  ZoneId,
  VehicleType,
} from "@/lib/uber/types";

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
  riders: Record<string, any>;
  trips: DriverTripLog[];
  zones: Record<string, CityZone>;
  drivers: Driver[];
  rides: RideRequest[];
  surgeRequests: SurgeHandlingRequest[];
  marketplaceMetrics: {
    cityAvgSurge: number;
    avgRiderWaitTimeMin: number;
    avgDriverHourlyRate: number;
    unfulfilledRequests: number;
    totalTripsActive: number;
    antiHerdDampingActive: boolean;
    transitNetworkHealthPercent: number;
  };
}

/**
 * Enterprise Custom Embedded Document Database Engine
 * 100% Custom Self-Hosted Local Persistence - Zero External Cloud Dependency
 */
class CustomDriverDatabase {
  private inMemoryDb: DatabaseSchema;
  private dbFilePath: string;
  private isPersisting: boolean = false;

  constructor() {
    const isServerless = Boolean(
      process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.TMPDIR ||
      process.env.NODE_ENV === "production"
    );
    const storageDir = process.env.DATA_DIR || (isServerless ? "/tmp" : path.join(process.cwd(), ".data"));
    this.dbFilePath = path.join(storageDir, "uber_driver_database.json");

    if ((globalThis as any).__UBER_IN_MEMORY_DB__) {
      this.inMemoryDb = (globalThis as any).__UBER_IN_MEMORY_DB__;
    } else {
      this.inMemoryDb = {
        users: {},
        profiles: {},
        sessions: {},
        riders: {},
        trips: [],
        zones: this.getDefaultZones(),
        drivers: this.getDefaultDrivers(),
        rides: this.getDefaultRides(),
        surgeRequests: this.getDefaultSurgeRequests(),
        marketplaceMetrics: this.getDefaultMetrics(),
      };
      (globalThis as any).__UBER_IN_MEMORY_DB__ = this.inMemoryDb;
    }

    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed) {
          this.inMemoryDb = {
            users: { ...this.inMemoryDb.users, ...(parsed.users || {}) },
            profiles: { ...this.inMemoryDb.profiles, ...(parsed.profiles || {}) },
            sessions: { ...this.inMemoryDb.sessions, ...(parsed.sessions || {}) },
            riders: { ...this.inMemoryDb.riders, ...(parsed.riders || {}) },
            trips: parsed.trips || [],
            zones: parsed.zones && Object.keys(parsed.zones).length > 0 ? parsed.zones : this.getDefaultZones(),
            drivers: parsed.drivers && parsed.drivers.length > 0 ? parsed.drivers : this.getDefaultDrivers(),
            rides: parsed.rides && parsed.rides.length > 0 ? parsed.rides : (this.inMemoryDb.rides || this.getDefaultRides()),
            surgeRequests: parsed.surgeRequests && parsed.surgeRequests.length > 0 ? parsed.surgeRequests : this.getDefaultSurgeRequests(),
            marketplaceMetrics: parsed.marketplaceMetrics || this.getDefaultMetrics(),
          };
          (globalThis as any).__UBER_IN_MEMORY_DB__ = this.inMemoryDb;
        }
      } else {
        // Create initial database file immediately
        this.persistToDisk();
      }
    } catch (e) {
      console.warn("CustomDriverDatabase: Non-fatal load warning, using memory state:", e);
    }
  }

  private persistToDisk() {
    try {
      const dir = path.dirname(this.dbFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.inMemoryDb, null, 2), "utf-8");
      (globalThis as any).__UBER_IN_MEMORY_DB__ = this.inMemoryDb;
    } catch (e) {
      console.warn("CustomDriverDatabase: Disk persist note:", e);
    }
  }

  // =========================================================================
  // MARKETPLACE ZONES OPERATIONS
  // =========================================================================
  public getZones(): Record<string, CityZone> {
    return this.inMemoryDb.zones || this.getDefaultZones();
  }

  public getZone(id: string): CityZone | null {
    return this.inMemoryDb.zones?.[id] || null;
  }

  public saveZones(zones: Record<string, CityZone>) {
    this.inMemoryDb.zones = { ...zones };
    this.persistToDisk();
  }

  public updateZone(id: string, updates: Partial<CityZone>) {
    if (this.inMemoryDb.zones?.[id]) {
      this.inMemoryDb.zones[id] = { ...this.inMemoryDb.zones[id], ...updates };
      this.persistToDisk();
    }
  }

  // =========================================================================
  // FLEET DRIVER OPERATIONS
  // =========================================================================
  public getDrivers(): Driver[] {
    return this.inMemoryDb.drivers || this.getDefaultDrivers();
  }

  public getDriver(id: string): Driver | null {
    return this.inMemoryDb.drivers?.find((d) => d.id === id) || null;
  }

  public saveDrivers(drivers: Driver[]) {
    this.inMemoryDb.drivers = [...drivers];
    this.persistToDisk();
  }

  public updateDriver(id: string, updates: Partial<Driver>) {
    const idx = (this.inMemoryDb.drivers || []).findIndex((d) => d.id === id);
    if (idx !== -1) {
      this.inMemoryDb.drivers[idx] = { ...this.inMemoryDb.drivers[idx], ...updates };
      this.persistToDisk();
    }
  }

  // =========================================================================
  // RIDES & BOOKINGS OPERATIONS (CROSS-DEVICE TWO-PHONE REAL-TIME SYNC)
  // =========================================================================
  public getRides(): RideRequest[] {
    this.loadFromDisk();
    return this.inMemoryDb.rides || [];
  }

  public getLatestActiveRide(): RideRequest | null {
    this.loadFromDisk();
    const rides = this.inMemoryDb.rides || [];
    return (
      rides.find(
        (r) =>
          r.status === "REQUESTED" ||
          r.status === "PENDING" ||
          r.status === "ACCEPTED" ||
          r.status === "IN_PROGRESS"
      ) || null
    );
  }

  public createRideRequest(ride: RideRequest): RideRequest {
    this.loadFromDisk();
    if (!this.inMemoryDb.rides) this.inMemoryDb.rides = [];
    this.inMemoryDb.rides = [ride, ...this.inMemoryDb.rides].slice(0, 50);
    this.persistToDisk();
    return ride;
  }

  public updateRideStatus(
    rideId: string,
    status: RideRequest["status"],
    driverDetails?: Partial<RideRequest>
  ): RideRequest | null {
    this.loadFromDisk();
    if (!this.inMemoryDb.rides) return null;
    const found = this.inMemoryDb.rides.find((r) => r.id === rideId);
    if (found) {
      found.status = status;
      if (driverDetails) {
        Object.assign(found, driverDetails);
      }
      this.persistToDisk();
      return found;
    }
    return null;
  }

  public clearAllActiveRides(): void {
    this.loadFromDisk();
    if (this.inMemoryDb.rides) {
      this.inMemoryDb.rides = this.inMemoryDb.rides.map((r) => ({
        ...r,
        status: "COMPLETED" as const,
      }));
      this.persistToDisk();
    }
  }

  public getRiderRides(query?: string): RideRequest[] {
    this.loadFromDisk();
    const rides = this.inMemoryDb.rides || [];
    if (!query) return rides;
    const q = query.toLowerCase();
    return rides.filter(
      (r) =>
        (r.riderName && r.riderName.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.pickupAddress && r.pickupAddress.toLowerCase().includes(q))
    );
  }

  public getDriverRides(driverName?: string): RideRequest[] {
    this.loadFromDisk();
    const rides = this.inMemoryDb.rides || [];
    if (!driverName) return rides.filter((r) => r.status === "COMPLETED");
    const d = driverName.toLowerCase();
    return rides.filter(
      (r) => (r.driverName && r.driverName.toLowerCase().includes(d)) || r.status === "COMPLETED"
    );
  }

  public saveRiderProfile(rider: any): any {
    this.loadFromDisk();
    if (!this.inMemoryDb.riders) this.inMemoryDb.riders = {};
    const key = rider.phone || rider.id || "default_rider";
    this.inMemoryDb.riders[key] = {
      ...rider,
      updatedAt: new Date().toISOString(),
    };
    this.persistToDisk();
    return this.inMemoryDb.riders[key];
  }

  public getRiderProfile(idOrPhone: string): any {
    this.loadFromDisk();
    return (this.inMemoryDb.riders && this.inMemoryDb.riders[idOrPhone]) || null;
  }

  // =========================================================================
  // SURGE REQUESTS OPERATIONS
  // =========================================================================
  public getSurgeRequests(limit: number = 20): SurgeHandlingRequest[] {
    return (this.inMemoryDb.surgeRequests || []).slice(0, limit);
  }

  public saveSurgeRequests(requests: SurgeHandlingRequest[]) {
    if (!this.inMemoryDb.surgeRequests) this.inMemoryDb.surgeRequests = [];
    this.inMemoryDb.surgeRequests = [...requests, ...this.inMemoryDb.surgeRequests].slice(0, 100);
    this.persistToDisk();
  }

  // =========================================================================
  // MARKETPLACE METRICS OPERATIONS
  // =========================================================================
  public getMarketplaceMetrics() {
    return this.inMemoryDb.marketplaceMetrics || this.getDefaultMetrics();
  }

  public saveMarketplaceMetrics(metrics: any) {
    this.inMemoryDb.marketplaceMetrics = { ...metrics };
    this.persistToDisk();
  }

  // =========================================================================
  // DATABASE HEALTH & TELEMETRY
  // =========================================================================
  public getDatabaseStats() {
    return {
      engine: "Enterprise Custom Embedded JSON Document Database",
      storageType: "Local Persistent File Storage",
      filePath: this.dbFilePath,
      totalRegisteredUsers: Object.keys(this.inMemoryDb.users || {}).length,
      totalDriverProfiles: Object.keys(this.inMemoryDb.profiles || {}).length,
      totalActiveDrivers: (this.inMemoryDb.drivers || []).length,
      totalMetroZones: Object.keys(this.inMemoryDb.zones || {}).length,
      totalRidesBooked: (this.inMemoryDb.rides || []).length,
      totalSurgeLogged: (this.inMemoryDb.surgeRequests || []).length,
      totalTripsCompleted: (this.inMemoryDb.trips || []).length,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  // =========================================================================
  // USER & DRIVER AUTH OPERATIONS
  // =========================================================================
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
      currentEarnings: profileData.currentEarnings !== undefined ? profileData.currentEarnings : (existing?.currentEarnings || 1480),
      completedTrips: profileData.completedTrips !== undefined ? profileData.completedTrips : (existing?.completedTrips || 5),
      shiftHours: profileData.shiftHours !== undefined ? profileData.shiftHours : (existing?.shiftHours || 3.5),
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

  public getSectorTelemetry(city: string, zoneId: string) {
    const sectorStats: Record<string, any> = {
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

  // =========================================================================
  // DEFAULT ENTERPRISE DATASETS (PRE-LOADED INTO DATABASE FILE)
  // =========================================================================
  private getDefaultZones(): Record<string, CityZone> {
    return {
      STADIUM: {
        id: "STADIUM",
        name: "M. Chinnaswamy Stadium (Bengaluru)",
        city: "Bengaluru",
        lat: 12.9788,
        lng: 77.5996,
        radiusMeters: 1800,
        currentDemand: 280,
        activeDrivers: 24,
        surgeMultiplier: 3.5,
        predictedDemand15m: 350,
        deficitOrSurplus: 90,
        status: "HIGH_SURGE",
      },
      DOWNTOWN: {
        id: "DOWNTOWN",
        name: "MG Road & Brigade Road (Bengaluru)",
        city: "Bengaluru",
        lat: 12.9756,
        lng: 77.6097,
        radiusMeters: 1500,
        currentDemand: 160,
        activeDrivers: 20,
        surgeMultiplier: 1.4,
        predictedDemand15m: 175,
        deficitOrSurplus: 40,
        status: "BALANCED",
      },
      AIRPORT: {
        id: "AIRPORT",
        name: "Kempegowda Int'l Airport BLR T2 (Bengaluru)",
        city: "Bengaluru",
        lat: 13.1986,
        lng: 77.7066,
        radiusMeters: 4500,
        currentDemand: 190,
        activeDrivers: 40,
        surgeMultiplier: 1.8,
        predictedDemand15m: 210,
        deficitOrSurplus: 50,
        status: "HIGH_SURGE",
      },
      TECH_PARK: {
        id: "TECH_PARK",
        name: "Bellandur & Outer Ring Road (Bengaluru)",
        city: "Bengaluru",
        lat: 12.9279,
        lng: 77.6834,
        radiusMeters: 2800,
        currentDemand: 220,
        activeDrivers: 28,
        surgeMultiplier: 1.6,
        predictedDemand15m: 240,
        deficitOrSurplus: 65,
        status: "DEFICIT",
      },
      ENTERTAINMENT: {
        id: "ENTERTAINMENT",
        name: "Koramangala 5th Block (Bengaluru)",
        city: "Bengaluru",
        lat: 12.9352,
        lng: 77.6245,
        radiusMeters: 1600,
        currentDemand: 130,
        activeDrivers: 18,
        surgeMultiplier: 1.3,
        predictedDemand15m: 140,
        deficitOrSurplus: 30,
        status: "BALANCED",
      },
      DELHI_CENTRAL: {
        id: "DELHI_CENTRAL",
        name: "Connaught Place & JLN Stadium (Delhi)",
        city: "Delhi NCR",
        lat: 28.5828,
        lng: 77.2344,
        radiusMeters: 2500,
        currentDemand: 240,
        activeDrivers: 26,
        surgeMultiplier: 3.2,
        predictedDemand15m: 290,
        deficitOrSurplus: 85,
        status: "HIGH_SURGE",
      },
      DELHI_AIRPORT: {
        id: "DELHI_AIRPORT",
        name: "Indira Gandhi Int'l Airport DEL T3 (Delhi)",
        city: "Delhi NCR",
        lat: 28.5562,
        lng: 77.1000,
        radiusMeters: 4000,
        currentDemand: 210,
        activeDrivers: 38,
        surgeMultiplier: 2.1,
        predictedDemand15m: 230,
        deficitOrSurplus: 60,
        status: "DEFICIT",
      },
      DELHI_GURGAON: {
        id: "DELHI_GURGAON",
        name: "DLF Cyber Hub & Cyber City (Gurugram)",
        city: "Delhi NCR",
        lat: 28.4950,
        lng: 77.0895,
        radiusMeters: 2800,
        currentDemand: 180,
        activeDrivers: 22,
        surgeMultiplier: 2.5,
        predictedDemand15m: 220,
        deficitOrSurplus: 70,
        status: "HIGH_SURGE",
      },
      MUMBAI_BKC: {
        id: "MUMBAI_BKC",
        name: "Bandra Kurla Complex & Jio World (Mumbai)",
        city: "Mumbai",
        lat: 19.0657,
        lng: 72.8680,
        radiusMeters: 2500,
        currentDemand: 310,
        activeDrivers: 32,
        surgeMultiplier: 3.6,
        predictedDemand15m: 360,
        deficitOrSurplus: 110,
        status: "HIGH_SURGE",
      },
      MUMBAI_AIRPORT: {
        id: "MUMBAI_AIRPORT",
        name: "Chhatrapati Shivaji Maharaj BOM T2 (Mumbai)",
        city: "Mumbai",
        lat: 19.0896,
        lng: 72.8656,
        radiusMeters: 3500,
        currentDemand: 195,
        activeDrivers: 34,
        surgeMultiplier: 2.2,
        predictedDemand15m: 220,
        deficitOrSurplus: 55,
        status: "DEFICIT",
      },
      MUMBAI_SOUTH: {
        id: "MUMBAI_SOUTH",
        name: "Nariman Point & Marine Drive (Mumbai)",
        city: "Mumbai",
        lat: 18.9220,
        lng: 72.8347,
        radiusMeters: 2200,
        currentDemand: 140,
        activeDrivers: 18,
        surgeMultiplier: 1.5,
        predictedDemand15m: 155,
        deficitOrSurplus: 35,
        status: "BALANCED",
      },
      HYDERABAD_HITEC: {
        id: "HYDERABAD_HITEC",
        name: "HITEC City & Madhapur (Hyderabad)",
        city: "Hyderabad",
        lat: 17.4474,
        lng: 78.3762,
        radiusMeters: 2500,
        currentDemand: 170,
        activeDrivers: 22,
        surgeMultiplier: 1.8,
        predictedDemand15m: 190,
        deficitOrSurplus: 50,
        status: "DEFICIT",
      },
      HYDERABAD_AIRPORT: {
        id: "HYDERABAD_AIRPORT",
        name: "Rajiv Gandhi Int'l Airport HYD (Hyderabad)",
        city: "Hyderabad",
        lat: 17.2403,
        lng: 78.4294,
        radiusMeters: 2400,
        currentDemand: 80,
        activeDrivers: 10,
        surgeMultiplier: 1.1,
        predictedDemand15m: 95,
        deficitOrSurplus: 70,
        status: "NORMAL",
      },
      CHENNAI_OMR: {
        id: "CHENNAI_OMR",
        name: "OMR IT Corridor & Tidel Park (Chennai)",
        city: "Chennai",
        lat: 12.9724,
        lng: 80.2508,
        radiusMeters: 2200,
        currentDemand: 90,
        activeDrivers: 10,
        surgeMultiplier: 1.1,
        predictedDemand15m: 105,
        deficitOrSurplus: 78,
        status: "NORMAL",
      },
      KOLKATA_SALTLAKE: {
        id: "KOLKATA_SALTLAKE",
        name: "Sector V & New Town IT Hub (Kolkata)",
        city: "Kolkata",
        lat: 22.5804,
        lng: 88.4378,
        radiusMeters: 2200,
        currentDemand: 85,
        activeDrivers: 10,
        surgeMultiplier: 1.2,
        predictedDemand15m: 100,
        deficitOrSurplus: 72,
        status: "NORMAL",
      },
    };
  }

  private getDefaultDrivers(): Driver[] {
    const rawDriverCatalog = [
      { name: "Ramesh Kumar", city: "Bengaluru", zone: "STADIUM" as ZoneId, type: "UBER_GO" as const, model: "Maruti Dzire", plate: "KA 01 MJ 1042" },
      { name: "Suresh Murthy", city: "Bengaluru", zone: "DOWNTOWN" as ZoneId, type: "UBER_PREMIER" as const, model: "Hyundai Verna", plate: "KA 03 AB 4091" },
      { name: "Priya Nair", city: "Bengaluru", zone: "TECH_PARK" as ZoneId, type: "UBER_GREEN_EV" as const, model: "Tata Nexon EV", plate: "KA 05 EV 8820" },
      { name: "Amit Sharma", city: "Bengaluru", zone: "ENTERTAINMENT" as ZoneId, type: "UBER_AUTO" as const, model: "Bajaj RE Auto", plate: "KA 04 AUTO 319" },
      { name: "Vikram Rao", city: "Bengaluru", zone: "AIRPORT" as ZoneId, type: "UBER_PREMIER" as const, model: "Toyota Innova Crysta", plate: "KA 51 D 7712" },
      { name: "Arjun Patil", city: "Bengaluru", zone: "STADIUM" as ZoneId, type: "UBER_GO" as const, model: "Hyundai Aura", plate: "KA 02 MH 2049" },
      { name: "Ananya Gowda", city: "Bengaluru", zone: "TECH_PARK" as ZoneId, type: "UBER_GREEN_EV" as const, model: "MG ZS EV", plate: "KA 05 EV 1904" },
      { name: "Deepak Lingam", city: "Bengaluru", zone: "DOWNTOWN" as ZoneId, type: "UBER_AUTO" as const, model: "Piaggio Ape Auto", plate: "KA 04 AUTO 882" },
      { name: "Rajesh Khanna", city: "Delhi NCR", zone: "DELHI_CENTRAL" as ZoneId, type: "UBER_PREMIER" as const, model: "Honda City", plate: "DL 01 AB 8841" },
      { name: "Kunal Mehra", city: "Delhi NCR", zone: "DELHI_GURGAON" as ZoneId, type: "UBER_GO" as const, model: "Maruti WagonR", plate: "HR 26 DQ 4920" },
      { name: "Neha Chawla", city: "Delhi NCR", zone: "DELHI_AIRPORT" as ZoneId, type: "UBER_PREMIER" as const, model: "Skoda Slavia", plate: "DL 03 CA 9012" },
      { name: "Sunil Yadav", city: "Delhi NCR", zone: "DELHI_CENTRAL" as ZoneId, type: "UBER_AUTO" as const, model: "TVS King Auto", plate: "DL 1R 7724" },
      { name: "Gaurav Malhotra", city: "Delhi NCR", zone: "DELHI_GURGAON" as ZoneId, type: "UBER_GREEN_EV" as const, model: "BYD Atto 3", plate: "HR 26 EV 3301" },
      { name: "Sachin Kadam", city: "Mumbai", zone: "MUMBAI_BKC" as ZoneId, type: "UBER_PREMIER" as const, model: "Hyundai Creta", plate: "MH 01 UB 4402" },
      { name: "Pooja Sawant", city: "Mumbai", zone: "MUMBAI_SOUTH" as ZoneId, type: "UBER_GO" as const, model: "Maruti Baleno", plate: "MH 02 BG 7182" },
      { name: "Mohan Parab", city: "Mumbai", zone: "MUMBAI_AIRPORT" as ZoneId, type: "UBER_PREMIER" as const, model: "Toyota Hycross", plate: "MH 03 CC 9920" },
      { name: "Santosh Shinde", city: "Mumbai", zone: "MUMBAI_BKC" as ZoneId, type: "UBER_AUTO" as const, model: "Bajaj Maxima", plate: "MH 02 AUTO 102" },
      { name: "Mahesh Deshmukh", city: "Mumbai", zone: "MUMBAI_SOUTH" as ZoneId, type: "UBER_GREEN_EV" as const, model: "Tata Tigor EV", plate: "MH 01 EV 6649" },
      { name: "Karthik Reddy", city: "Hyderabad", zone: "HYDERABAD_HITEC" as ZoneId, type: "UBER_GO" as const, model: "Maruti Dzire", plate: "TS 09 UA 1144" },
      { name: "Venkat Rao", city: "Hyderabad", zone: "HYDERABAD_AIRPORT" as ZoneId, type: "UBER_PREMIER" as const, model: "Kia Carens", plate: "TS 08 BC 8890" },
      { name: "Swathi Pillai", city: "Chennai", zone: "CHENNAI_OMR" as ZoneId, type: "UBER_GREEN_EV" as const, model: "Tata Nexon EV", plate: "TN 07 EV 4401" },
      { name: "Muthu Raman", city: "Chennai", zone: "CHENNAI_OMR" as ZoneId, type: "UBER_AUTO" as const, model: "Bajaj RE", plate: "TN 09 AUTO 551" },
      { name: "Subrata Roy", city: "Kolkata", zone: "KOLKATA_SALTLAKE" as ZoneId, type: "UBER_GO" as const, model: "Hyundai Grand i10", plate: "WB 02 AB 3302" },
      { name: "Debashis Sen", city: "Kolkata", zone: "KOLKATA_SALTLAKE" as ZoneId, type: "UBER_PREMIER" as const, model: "Honda Elevate", plate: "WB 06 D 8812" },
    ];

    const zones = this.getDefaultZones();
    return rawDriverCatalog.map((spec, i) => {
      const z = zones[spec.zone];
      const offsetLat = (Math.random() - 0.5) * 0.015;
      const offsetLng = (Math.random() - 0.5) * 0.015;
      return {
        id: `DRV_${spec.city.toUpperCase().slice(0, 3)}_${(i + 1).toString().padStart(3, "0")}`,
        name: spec.name,
        city: spec.city,
        rating: +(4.85 + Math.random() * 0.14).toFixed(2),
        vehicleType: spec.type,
        vehicleModel: spec.model,
        licensePlate: spec.plate,
        batteryOrFuelPercent: Math.floor(Math.random() * 40) + 60,
        currentZone: spec.zone,
        status: i % 4 === 0 ? "ON_TRIP" : i % 5 === 0 ? "EN_ROUTE_SURGE" : "IDLE",
        lat: z ? +(z.lat + offsetLat).toFixed(6) : 12.9788,
        lng: z ? +(z.lng + offsetLng).toFixed(6) : 77.5996,
        heading: Math.floor(Math.random() * 360),
        speedKmh: Math.floor(Math.random() * 25) + 15,
        earningsToday: Math.floor(Math.random() * 1500) + 1200,
        tripsCompleted: Math.floor(Math.random() * 6) + 4,
        shiftHours: +(3 + Math.random() * 4).toFixed(1),
      };
    });
  }

  private getDefaultSurgeRequests(): SurgeHandlingRequest[] {
    const indianNames = [
      "Rahul Verma", "Ananya Sharma", "Rohan Mehta", "Priya Kulkarni",
      "Vikram Patel", "Sneha Rao", "Arjun Nair", "Kavita Reddy",
      "Aditya Das", "Pooja Malhotra", "Kunal Singhania", "Neha Iyer"
    ];
    const destinations = [
      "Kempegowda International Airport (BLR T2)",
      "Indiranagar 100ft Road Metro",
      "Koramangala 5th Block Club Area",
      "DLF Cyber Hub Phase 2, Gurugram",
      "Bandra Kurla Complex (BKC), Mumbai",
      "HITEC City Cyber Towers, Hyderabad",
    ];
    const gates = ["Gate A (North Arterial Link)", "Gate B (Metro Skywalk Plaza)", "Gate C (South Express Flyover)"];
    const now = Date.now();

    return indianNames.map((name, i) => {
      const baseFare = 380 + i * 25;
      const surgeBonus = Math.round(baseFare * 1.8);
      return {
        id: `SRG-${(1000 + i).toString()}-${now.toString().slice(-4)}`,
        timestamp: new Date(now - (12 - i) * 60000).toLocaleTimeString("en-US", { hour12: false }),
        riderName: name,
        pickupLocation: "M. Chinnaswamy Stadium, MG Road",
        dropoffLocation: destinations[i % destinations.length],
        vehicleClass: i % 2 === 0 ? "Uber Go" : "Uber Premier",
        surgeMultiplier: 2.8,
        baseFareInr: baseFare,
        surgeBonusInr: surgeBonus,
        totalFareInr: baseFare + surgeBonus,
        dispersalGate: gates[i % gates.length],
        waveNumber: i < 4 ? 1 : i < 8 ? 2 : 3,
        waveStatus: i < 4 ? "DISPATCHED" : "BUFFER_QUEUED",
        antiHerdEngaged: true,
        latencyMs: +(1.4 + Math.random() * 2.2).toFixed(1),
      };
    });
  }

  private getDefaultRides(): RideRequest[] {
    return [
      {
        id: "RIDE-982140",
        riderName: "Aman Gupta",
        riderRating: 4.95,
        pickupAddress: "Kempegowda International Airport (BLR T2)",
        pickupCoords: [13.1986, 77.7066],
        dropoffAddress: "Indiranagar 100ft Road Metro, Bengaluru",
        dropoffCoords: [12.9784, 77.6408],
        vehicleType: "UBER_PREMIER",
        distanceKm: 38,
        durationMin: 52,
        fareInr: 890,
        surgeMultiplier: 1.4,
        surgeBonusInr: 254,
        timestamp: "Yesterday, 07:45 PM",
        status: "COMPLETED",
        paymentMode: "GOOGLE_PAY_UPI",
        driverName: "Rajesh Kumar",
        vehicleModel: "Maruti Suzuki Dzire",
        licensePlate: "KA 01 MJ 4829",
        otp: "4829",
      },
      {
        id: "RIDE-871234",
        riderName: "Aman Gupta",
        riderRating: 4.95,
        pickupAddress: "Koramangala 5th Block Club Area",
        pickupCoords: [12.9352, 77.6245],
        dropoffAddress: "Bellandur EcoSpace Outer Ring Rd",
        dropoffCoords: [12.926, 77.6762],
        vehicleType: "UBER_GO",
        distanceKm: 9.5,
        durationMin: 24,
        fareInr: 340,
        surgeMultiplier: 1.8,
        surgeBonusInr: 151,
        timestamp: "Yesterday, 10:15 AM",
        status: "COMPLETED",
        paymentMode: "CORPORATE_CARD",
        driverName: "Sunil Yadav",
        vehicleModel: "Hyundai Aura",
        licensePlate: "KA 05 AB 1122",
        otp: "1122",
      },
      {
        id: "RIDE-763491",
        riderName: "Priya Sharma",
        riderRating: 4.98,
        pickupAddress: "M. Chinnaswamy Stadium, MG Road",
        pickupCoords: [12.9788, 77.5996],
        dropoffAddress: "Whitefield ITPL Main Gate",
        dropoffCoords: [12.9866, 77.7381],
        vehicleType: "UBER_GREEN_EV",
        distanceKm: 18.2,
        durationMin: 40,
        fareInr: 580,
        surgeMultiplier: 2.2,
        surgeBonusInr: 316,
        timestamp: "2 days ago, 11:30 PM",
        status: "COMPLETED",
        paymentMode: "GOOGLE_PAY_UPI",
        driverName: "Rajesh Kumar",
        vehicleModel: "Tata Tigor EV",
        licensePlate: "KA 01 MJ 4829",
        otp: "4829",
      },
    ];
  }

  private getDefaultMetrics() {
    return {
      cityAvgSurge: 1.28,
      avgRiderWaitTimeMin: 6.8,
      avgDriverHourlyRate: 485,
      unfulfilledRequests: 42,
      totalTripsActive: 48,
      antiHerdDampingActive: false,
      transitNetworkHealthPercent: 98.4,
    };
  }
}

// Singleton custom database instance
export const driverDb = new CustomDriverDatabase();
