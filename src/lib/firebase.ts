// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics, FirebaseAnalytics } from "firebase/analytics";
import { getFirestore, FirebaseFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let analytics: FirebaseAnalytics | undefined;
let firebaseApp: FirebaseApp | undefined;
let db: FirebaseFirestore | undefined;

// Function to initialize Firebase if configuration is complete
async function initializeFirebase() {
  try {
    // Ensure all required Firebase config values are present
    if (
      !firebaseConfig.apiKey ||
      !firebaseConfig.authDomain ||
      !firebaseConfig.projectId ||
      !firebaseConfig.storageBucket ||
      !firebaseConfig.messagingSenderId ||
      !firebaseConfig.appId
    ) {
      console.error('Missing Firebase configuration values');
      return;
    }

    if (firebaseConfig.apiKey &&
        firebaseConfig.authDomain &&
        firebaseConfig.projectId &&
        firebaseConfig.storageBucket &&
        firebaseConfig.messagingSenderId &&
        firebaseConfig.appId) {

      firebaseApp = initializeApp(firebaseConfig);
      analytics = getAnalytics(firebaseApp);
      db = getFirestore(firebaseApp);
      console.log("Firebase initialized successfully!");
    } else {
        console.error('Firebase configuration object incomplete.');
    }
  } catch (e) {
    console.error('Failed to initialize Firebase:', e);
  }
}

// Call the initializeFirebase function
initializeFirebase();

export { firebaseApp, db };
