import { initializeApp, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAKKyHOIek1-hVrmF0m-6IVVyd8DK7XcRs",
  authDomain: "macrocoach-162cb.firebaseapp.com",
  projectId: "macrocoach-162cb",
  storageBucket: "macrocoach-162cb.firebasestorage.app",
  messagingSenderId: "83172856542",
  appId: "1:83172856542:web:a485aa18a398aaf1eb284f",
  measurementId: "G-YVEK8C8PDE"
};

// Initialize Firebase (check if already initialized)
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  // If app already exists, get the existing instance
  if (error.code === 'app/duplicate-app') {
    app = getApp();
  } else {
    throw error;
  }
}

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Firebase Storage and get a reference to the service
export const storage = getStorage(app);

export default app;
