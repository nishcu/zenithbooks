/**
 * ITR Decryption API Endpoint
 * Server-side decryption for CA team only
 */

import { NextRequest, NextResponse } from 'next/server';
import { decryptCredential } from '@/lib/itr/encryption';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { isCAUser } from '@/lib/itr/firestore';

// Initialize Firebase Admin (if not already initialized)
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify token and get user
    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Check if user is CA team
    const isCA = await isCAUser(uid);
    if (!isCA) {
      return NextResponse.json(
        { error: 'Access denied. CA team access required.' },
        { status: 403 }
      );
    }

    const { encrypted } = await request.json();

    if (!encrypted || typeof encrypted !== 'string') {
      return NextResponse.json(
        { error: 'Invalid encrypted data provided' },
        { status: 400 }
      );
    }

    // Decrypt the data
    const decrypted = decryptCredential(encrypted);

    // Log access
    // TODO: Log credential access to Firestore

    return NextResponse.json({ decrypted });
  } catch (error: any) {
    console.error('Decryption error:', error);
    return NextResponse.json(
      { error: 'Failed to decrypt data' },
      { status: 500 }
    );
  }
}

