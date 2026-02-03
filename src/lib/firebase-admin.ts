/**
 * Firebase Admin SDK – for server-side API routes that need to bypass Firestore rules
 * (e.g. admin list of users, professionals). Uses service account from env.
 */

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminFirestore: Firestore | null = null;

function initAdminIfNeeded(): boolean {
  if (getApps().length > 0) return true;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    return false;
  }
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
  return true;
}

/**
 * Returns Firestore instance from Firebase Admin SDK, or null if credentials are not configured.
 * Bypasses Firestore security rules (use only in trusted server routes, e.g. admin APIs).
 */
export function getAdminFirestore(): Firestore | null {
  if (!initAdminIfNeeded()) return null;
  if (!adminFirestore) {
    adminFirestore = getFirestore();
  }
  return adminFirestore;
}

/** Message to return when Firebase Admin is not configured (e.g. missing .env.local vars). */
export const FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE =
  'Firebase Admin not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env.local or Vercel.';
