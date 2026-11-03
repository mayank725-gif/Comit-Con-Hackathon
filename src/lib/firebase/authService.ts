import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "./config";
import { DriverUser, DriverWorkProfile } from "@/lib/db/driverDb";

export interface RealAuthResult {
  success: boolean;
  user: DriverUser | null;
  profile: DriverWorkProfile | null;
  error?: string;
  source: "FIREBASE_GOOGLE" | "CUSTOM_DATABASE";
}

/**
 * Perform Real Google Sign-In via Firebase Authentication SDK
 * Driver data is stored strictly in our OWN database (Zero Firestore dependency)
 */
export async function signInWithRealGoogleFirebase(): Promise<RealAuthResult> {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    return {
      success: false,
      user: null,
      profile: null,
      source: "CUSTOM_DATABASE",
      error: "Firebase Authentication is not configured yet.",
    };
  }

  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const fbUser = cred.user;

    const email = fbUser.email || "";
    const name = fbUser.displayName || email.split("@")[0] || "Uber Driver";
    const avatar = fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const uid = fbUser.uid;

    // Synchronize directly with our OWN self-hosted database
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

    if (!data.success) {
      throw new Error(data.error || "Failed to persist driver in custom database");
    }

    return {
      success: true,
      user: data.user,
      profile: data.profile,
      source: "FIREBASE_GOOGLE",
    };
  } catch (err: any) {
    console.error("Firebase Sign-in error:", err);
    let friendlyError = err?.message || "Failed to sign in with Google";

    if (err?.code === "auth/unauthorized-domain") {
      friendlyError = `Domain not authorized yet in Firebase. Please add "${typeof window !== 'undefined' ? window.location.hostname : 'your domain'}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
    } else if (err?.code === "auth/operation-not-allowed") {
      friendlyError = "Google Sign-in is not enabled yet in your Firebase project. Please enable Google in Firebase Console -> Authentication -> Sign-in Method.";
    } else if (err?.code === "auth/popup-blocked") {
      friendlyError = "Sign-in popup was blocked by your browser. Please allow popups for this site.";
    } else if (err?.code === "auth/popup-closed-by-user") {
      friendlyError = "Sign-in popup was closed before completing.";
    }

    return {
      success: false,
      user: null,
      profile: null,
      source: "CUSTOM_DATABASE",
      error: friendlyError,
    };
  }
}

/**
 * Save Driver Territory and Operating Sector directly to our OWN database
 */
export async function saveDriverProfileToCustomDb(
  profileData: any
): Promise<{ success: boolean; profile?: DriverWorkProfile; error?: string }> {
  try {
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
    const data = await res.json();
    return {
      success: data.success,
      profile: data.profile,
      error: data.error,
    };
  } catch (err: any) {
    console.error("Error saving to custom database:", err);
    return {
      success: false,
      error: err?.message || "Failed to update profile",
    };
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
