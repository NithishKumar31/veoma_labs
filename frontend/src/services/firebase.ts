import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiUFzJo3fxBdS_GH9vC4RAi-CMFQVhRow",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "veoma-labs.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "veoma-labs",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "veoma-labs.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "858077470175",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:858077470175:web:670615e8f545dd6a23f86a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-8L77YXMLVR"
};

// Initialize Firebase App (prevents duplicate initialization in HMR)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Analytics safely (with browser window check)
export const analyticsPromise = typeof window !== "undefined"
  ? isSupported().then((supported) => (supported ? getAnalytics(app) : null)).catch(() => null)
  : Promise.resolve(null);
