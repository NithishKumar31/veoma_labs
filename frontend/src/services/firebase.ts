import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Veoma Labs Firebase Web App Configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiUFzJo3fxBdS_GH9vC4RAi-CMFQVhRow",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "veoma-labs.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "veoma-labs",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "veoma-labs.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "858077470175",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:858077470175:web:670615e8f545dd6a23f86a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8L77YXMLVR"
};

// Initialize Firebase App instance (safely handles HMR in Vite)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore Database
export const db = getFirestore(app);

// Initialize Cloud Storage
export const storage = getStorage(app);

// Initialize Google Analytics safely for browser
export const analyticsPromise = typeof window !== "undefined"
  ? isSupported().then((supported) => (supported ? getAnalytics(app) : null)).catch(() => null)
  : Promise.resolve(null);

// Status helper
export const isFirebaseConnected = true;
export const firebaseProjectInfo = {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
  status: "CONNECTED"
};

/**
 * Uploads a file to Firebase Cloud Storage and returns the public download URL
 */
export async function uploadFileToFirebase(file: File, folder = "uploads"): Promise<string> {
  const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storageRef = ref(storage, `${folder}/${filename}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

/**
 * Saves a document to Cloud Firestore
 */
export async function saveDocumentToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, docId), {
      ...data,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn(`Firestore save to ${collectionName} warning:`, err);
  }
}

/**
 * Fetches documents from a Cloud Firestore collection
 */
export async function fetchCollectionFromFirestore(collectionName: string): Promise<any[]> {
  try {
    const snap = await getDocs(collection(db, collectionName));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`Firestore read from ${collectionName} warning:`, err);
    return [];
  }
}
