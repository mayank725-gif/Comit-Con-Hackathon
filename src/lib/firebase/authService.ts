import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "./config";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";

export interface RealAuthResult {
  success: boolean;
  user: DriverUser | null;
  profile: DriverWorkProfile | null;
  error?: string;
  source: "FIREBASE_FIRESTORE" | "BACKEND_FALLBACK";
}

/**
 * Perform Real Google Sign-In via Firebase Authentication SDK
 */
export async function signInWithRealGoogleFirebase(): Promise<RealAuthResult> {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    return {
      success: false,
      user: null,
      profile: null,
      source: "BACKEND_FALLBACK",
      error: "Firebase API Keys are not yet configured. Please provide your Firebase project keys.",
    };
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;

    const email = fbUser.email || "";
    const name = fbUser.displayName || email.split("@")[0] || "Uber Driver";
    const avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const uid = fbUser.uid;

    // 1. Sync or retrieve from Firestore document collection 'drivers'
    let firestoreProfile: any = null;
    if (db) {
      try {
        const docRef = doc(db, "drivers", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          firestoreProfile = docSnap.data();
        } else {
          // Initialize new driver profile in Firestore
          const defaultProfile = {
            userId: uid,
            driverName: name,
            email,
            avatar,
            city: "BENGALURU",
            cityName: "Bengaluru (Bangalore)",
            primaryZone: "STADIUM",
            primaryZoneName: "M. Chinnaswamy Stadium & MG Road CBD",
            vehicleType: "UBER_GO",
            vehicleModel: "Maruti Suzuki Dzire VXI",
            licensePlate: "KA 01 UB 8088",
            willingOutstation: true,
            dailyEarningsTarget: 3000,
            currentEarnings: 2070,
            completedTrips: 7,
            shiftHours: 4.5,
            isOnDuty: true,
            assignedCoordinates: [12.9788, 77.5980],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(docRef, defaultProfile, { merge: true });
          firestoreProfile = defaultProfile;
        }
      } catch (fsErr) {
        console.warn("Firestore access notice:", fsErr);
      }
    }

    // 2. Synchronize with our Next.js backend session
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleId: uid,
        email,
        name,
        avatar,
      }),
    });

    const data = await res.json();

    const finalUser: DriverUser = {
      id: uid,
      googleId: uid,
      email,
      name,
      avatar,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    const finalProfile: DriverWorkProfile = firestoreProfile
      ? {
          ...data.profile,
          ...firestoreProfile,
          userId: uid,
          driverName: firestoreProfile.driverName || name,
        }
      : data.profile;

    return {
      success: true,
      user: finalUser,
      profile: finalProfile,
      source: "FIREBASE_FIRESTORE",
    };
  } catch (err: any) {
    console.error("Firebase Sign-in error:", err);
    return {
      success: false,
      user: null,
      profile: null,
      source: "FIREBASE_FIRESTORE",
      error: err?.message || "Failed to sign in with Google Firebase",
    };
  }
}

/**
 * Save Driver Territory and Operating Sector directly to Cloud Firestore
 */
export async function saveDriverProfileToFirestore(
  userId: string,
  profileUpdates: Partial<DriverWorkProfile>
): Promise<boolean> {
  if (!db) return false;

  try {
    const docRef = doc(db, "drivers", userId);
    await setDoc(
      docRef,
      {
        ...profileUpdates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error("Error saving to Firestore:", err);
    return false;
  }
}

/**
 * Real-time Firebase Authentication Listener
 */
export function subscribeToFirebaseAuth(callback: (user: FirebaseUser | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Real Google Firebase Logout
 */
export async function logoutDriverFirebase(): Promise<void> {
  if (auth) {
    try {
      await signOut(auth);
    } catch (e) {
      console.warn("Firebase signout notice:", e);
    }
  }
  await fetch("/api/auth/logout", { method: "POST" });
}
