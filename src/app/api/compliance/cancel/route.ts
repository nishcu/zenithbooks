/**
 * API Route: Cancel Compliance Subscription
 * POST /api/compliance/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { cancelComplianceSubscription } from '@/lib/compliance-plans/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin
let adminInitialized = false;
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      adminInitialized = true;
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  adminInitialized = true;
}

export async function POST(request: NextRequest) {
  try {
    if (!adminInitialized) {
      throw new Error('Firebase Admin not initialized');
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authAdmin = getAuth();
    const decodedToken = await authAdmin.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { subscriptionId } = body;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required', success: false },
        { status: 400 }
      );
    }

    await cancelComplianceSubscription(subscriptionId, userId);

    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
    });
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel subscription',
        message: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

