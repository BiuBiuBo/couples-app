import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCdcLYl_iWdvEHCAETnzmzBhamuWTmsFWk",
  authDomain: "chungminh-9b34c.firebaseapp.com",
  projectId: "chungminh-9b34c",
  storageBucket: "chungminh-9b34c.firebasestorage.app",
  messagingSenderId: "782141169228",
  appId: "1:782141169228:web:3545fa2c79d64af55f1ee9",
  measurementId: "G-VXWN8YRG9Z"
};

// Initialize Firebase (Singleton pattern for Next.js)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
