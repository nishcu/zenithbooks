
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

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
