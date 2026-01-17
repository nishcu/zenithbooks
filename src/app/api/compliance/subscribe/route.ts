/**
 * API Route: Subscribe to Compliance Plan
 * POST /api/compliance/subscribe
 * ICAI-Compliant: ZenithBooks as principal service provider
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createOrUpdateComplianceSubscription, generateMonthlyComplianceTasks } from '@/lib/compliance-plans/firestore';
import { getCompliancePlan } from '@/lib/compliance-plans/constants';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CompliancePlanTier } from '@/lib/compliance-plans/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin if needed
let adminInitialized = false;
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.error('Firebase Admin credentials missing');
    } else {
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

function ensureAdminInitialized() {
  if (!adminInitialized && getApps().length === 0) {
    throw new Error('Firebase Admin is not initialized');
  }
}

export async function POST(request: NextRequest) {
  try {
    ensureAdminInitialized();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const authAdmin = getAuth();
    const decodedToken = await authAdmin.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { planTier, billingPeriod, paymentMethodId, autoRenew = true } = body;

    // Validate plan tier
    if (!planTier || !['core', 'statutory', 'complete'].includes(planTier)) {
      return NextResponse.json(
        { error: 'Invalid plan tier', success: false },
        { status: 400 }
      );
    }

    // Get user data to extract firmId
    const userDoc = await getDoc(doc(db, 'users', userId)).catch(() => null);
    const userData = userDoc?.data();
    const firmId = userData?.firmId || userId;
    const firmName = userData?.companyName || userData?.firmName || decodedToken.name || 'Firm';

    // Get plan details
    const plan = getCompliancePlan(planTier as CompliancePlanTier);
    const price = billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice;

    // Calculate dates
    const now = new Date();
    const renewalDate = new Date(now);
    if (billingPeriod === 'annual') {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    // Create subscription
    const subscriptionId = await createOrUpdateComplianceSubscription({
      userId,
      firmId,
      planTier: planTier as CompliancePlanTier,
      status: 'active',
      startDate: Timestamp.fromDate(now),
      renewalDate: Timestamp.fromDate(renewalDate),
      autoRenew,
      paymentMethodId,
    });

    // Generate initial monthly tasks
    const subscription = {
      id: subscriptionId,
      userId,
      firmId,
      planTier: planTier as CompliancePlanTier,
      status: 'active' as const,
      startDate: Timestamp.fromDate(now),
      renewalDate: Timestamp.fromDate(renewalDate),
      autoRenew,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const taskIds = await generateMonthlyComplianceTasks(subscriptionId, subscription);

    return NextResponse.json({
      success: true,
      subscriptionId,
      planTier,
      price,
      billingPeriod,
      taskIdsGenerated: taskIds.length,
      message: `Successfully subscribed to ${plan.name}. ${taskIds.length} compliance tasks generated.`,
    });
  } catch (error: any) {
    console.error('Error subscribing to compliance plan:', error);
    return NextResponse.json(
      {
        error: 'Failed to subscribe to compliance plan',
        message: error.message,
        success: false,
      },
      { status: 500 }
    );
  }
}

