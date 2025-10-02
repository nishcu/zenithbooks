
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "studio-6259025457-56a27",
  "appId": "1:1087525550620:web:1a0d1aac086ed43fdbfdd9",
  "storageBucket": "studio-6259025457-56a27.firebasestorage.app",
  "apiKey": "AIzaSyCdUc7IDGnBabQoERUcbYcC7N7x_ipUNk0",
  "authDomain": "studio-6259025457-56a27.firebaseapp.com",
  "messagingSenderId": "1087525550620"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
