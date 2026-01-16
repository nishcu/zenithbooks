
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXmXtFpGH5DiMlvX8_jL7TkO6Jsf4Phzg",
  authDomain: "zenithbooks-1c818.firebaseapp.com",
  projectId: "zenithbooks-1c818",
  storageBucket: "zenithbooks-1c818.firebasestorage.app",
  messagingSenderId: "785368114951",
  appId: "1:785368114951:web:21a0e7283d7a280cb9c7a2",
  measurementId: "G-M7755L0HDD"
};

// Initialize Firebase - ensure app exists before getting services
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Try to get existing app as fallback
  const apps = getApps();
  app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
}

// Initialize services with error handling
let db, auth, storage;
try {
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Firebase service initialization error:', error);
  // Re-initialize app if services fail
  if (!app || getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } else {
    // If app exists but services failed, try to get services again
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  }
}

export { app, db, auth, storage };
