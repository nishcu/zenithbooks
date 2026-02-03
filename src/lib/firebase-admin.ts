/**
 * Firebase Admin SDK – for server-side API routes that need to bypass Firestore rules
 * (e.g. admin list of users, professionals). Uses service account from env.
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminFirestore: Firestore | null = null;

function initAdminIfNeeded(): void {
  if (getApps().length > 0) return;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    throw new Error('Firebase Admin credentials missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

/**
 * Returns Firestore instance from Firebase Admin SDK.
 * Bypasses Firestore security rules (use only in trusted server routes, e.g. admin APIs).
 */
export function getAdminFirestore(): Firestore {
  initAdminIfNeeded();
  if (!adminFirestore) {
    adminFirestore = getFirestore();
  }
  return adminFirestore;
}
