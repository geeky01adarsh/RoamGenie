// ============================================================
// Firebase Configuration — Auth + Firestore
// Gracefully handles missing config (app works without Firebase)
// ============================================================

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, type User, type Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, deleteDoc, Timestamp, type Firestore } from 'firebase/firestore';
import type { Trip } from '@shared/types/index';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Only initialize Firebase if config is present
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

if (apiKey && projectId) {
  try {
    const firebaseConfig = {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    console.log('[Firebase] Initialized successfully');
  } catch (error) {
    console.warn('[Firebase] Initialization failed — running without Firebase:', error);
  }
} else {
  console.warn('[Firebase] No config found — running without auth/persistence. Set VITE_FIREBASE_* env vars to enable.');
}

export { auth, db };

/** Whether Firebase is available */
export function isFirebaseAvailable(): boolean {
  return app !== null && auth !== null;
}

// ── Auth Functions ───────────────────────────────────────────

export async function signInWithGoogle(): Promise<User | null> {
  if (!auth || !googleProvider) {
    console.warn('[Firebase] Auth not available');
    return null;
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logOut(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

// ── Firestore Trip CRUD ──────────────────────────────────────

export async function saveTrip(trip: Trip): Promise<void> {
  if (!db || !auth?.currentUser) {
    console.warn('[Firebase] Firestore not available — trip not saved');
    return;
  }

  const userId = auth.currentUser.uid;
  const tripRef = doc(db, 'users', userId, 'trips', trip.id);
  await setDoc(tripRef, {
    ...trip,
    userId,
    updatedAt: Timestamp.now(),
  });
}

export async function loadTrip(tripId: string): Promise<Trip | null> {
  if (!db || !auth?.currentUser) return null;

  const userId = auth.currentUser.uid;
  const tripRef = doc(db, 'users', userId, 'trips', tripId);
  const snapshot = await getDoc(tripRef);

  if (!snapshot.exists()) return null;
  return snapshot.data() as Trip;
}

export async function loadAllTrips(): Promise<Trip[]> {
  if (!db || !auth?.currentUser) return [];

  const userId = auth.currentUser.uid;
  const tripsRef = collection(db, 'users', userId, 'trips');
  const snapshot = await getDocs(tripsRef);

  return snapshot.docs.map((d) => d.data() as Trip);
}

export async function deleteTrip(tripId: string): Promise<void> {
  if (!db || !auth?.currentUser) return;

  const userId = auth.currentUser.uid;
  const tripRef = doc(db, 'users', userId, 'trips', tripId);
  await deleteDoc(tripRef);
}
