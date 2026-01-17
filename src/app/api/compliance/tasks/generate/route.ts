/**
 * API Route: Generate Monthly Compliance Tasks
 * POST /api/compliance/tasks/generate
 * Auto-generates monthly tasks for active subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
  getComplianceSubscriptionByUserId,
  generateMonthlyComplianceTasks,
} from '@/lib/compliance-plans/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

/**
 * Generate tasks for a specific user's subscription
 */
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

    // Get user's subscription
    const subscription = await getComplianceSubscriptionByUserId(userId);
    if (!subscription) {
      return NextResponse.json(
        { error: 'No active compliance subscription found', success: false },
        { status: 404 }
      );
    }

    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription is not active', success: false },
        { status: 400 }
      );
    }

    // Generate monthly tasks
    const taskIds = await generateMonthlyComplianceTasks(subscription.id, subscription);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      taskIdsGenerated: taskIds.length,
      taskIds,
      message: `Generated ${taskIds.length} compliance tasks for this month.`,
    });
  } catch (error: any) {
    console.error('Error generating compliance tasks:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate compliance tasks',
        message: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate tasks for all active subscriptions (cron job endpoint)
 * This would be called by a scheduled job
 */
export async function GET(request: NextRequest) {
  try {
    if (!adminInitialized) {
      throw new Error('Firebase Admin not initialized');
    }

    // Check for admin/secret key
    const secretKey = request.headers.get('x-cron-secret');
    if (secretKey !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid cron secret' },
        { status: 401 }
      );
    }

    // Get all active subscriptions
    const subscriptionsQuery = query(
      collection(db, 'compliance_subscriptions'),
      where('status', '==', 'active')
    );
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);

    const results = [];
    for (const subDoc of subscriptionsSnapshot.docs) {
      try {
        const subscription = {
          id: subDoc.id,
          ...subDoc.data(),
          startDate: subDoc.data().startDate?.toDate() || new Date(),
          renewalDate: subDoc.data().renewalDate?.toDate() || new Date(),
          lastTaskGeneration: subDoc.data().lastTaskGeneration?.toDate() || undefined,
          createdAt: subDoc.data().createdAt?.toDate() || new Date(),
          updatedAt: subDoc.data().updatedAt?.toDate() || new Date(),
        };

        const taskIds = await generateMonthlyComplianceTasks(subDoc.id, subscription as any);
        results.push({
          subscriptionId: subDoc.id,
          userId: subscription.userId,
          taskIdsGenerated: taskIds.length,
        });
      } catch (error: any) {
        console.error(`Error generating tasks for subscription ${subDoc.id}:`, error);
        results.push({
          subscriptionId: subDoc.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      subscriptionsProcessed: results.length,
      results,
      message: `Processed ${results.length} subscriptions.`,
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    return NextResponse.json(
      {
        error: 'Failed to process subscriptions',
        message: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

