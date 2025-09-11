// NOTE: This file is now used for Firebase client initialization, despite its legacy filename.

import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhLcP7n7-GKoef6-8G1ciH_NFzIaSK3oE",
  authDomain: "plexi-ai-search.firebaseapp.com",
  projectId: "plexi-ai-search",
  storageBucket: "plexi-ai-search.firebasestorage.app",
  messagingSenderId: "382067176941",
  appId: "1:382067176941:web:9827e4ff2415fda9a763e4",
  measurementId: "G-M9F5EQTBSJ"
};


let app;
let auth;
let db;
let functions;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  functions = getFunctions(app);
} catch (e) {
  console.error("Firebase initialization failed. Please add your Firebase config to services/supabaseClient.ts", e);
  // The app will be in a non-functional state for features requiring Firebase.
}


export { app, auth, db, functions };