/**
 * API Route: Apply for Task
 * POST /api/tasks/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, Auth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { applyForTask, getTaskPost } from '@/lib/tasks/firestore';
import type { TaskApplication } from '@/lib/professionals/types';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin if needed
let adminInitialized = false;
let firebaseAdminApp: App | undefined;

if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      console.error('Firebase Admin credentials missing:', {
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        hasPrivateKey: !!privateKey,
      });
    } else {
      firebaseAdminApp = initializeApp({
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
  firebaseAdminApp = getApps()[0];
  adminInitialized = true;
}

// Helper function to ensure Admin is initialized
function ensureAdminInitialized(): Auth {
  if (!adminInitialized || !firebaseAdminApp) {
    throw new Error('Firebase Admin is not initialized. Please check environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
  return getAuth(firebaseAdminApp);
}

export async function POST(request: NextRequest) {
  try {
    // Ensure Firebase Admin is initialized
    let authAdmin: Auth;
    try {
      authAdmin = ensureAdminInitialized();
    } catch (initError: any) {
      console.error('Firebase Admin initialization check failed:', initError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          message: initError.message || 'Firebase Admin is not properly configured. Please contact support.',
          details: process.env.NODE_ENV === 'development' ? {
            hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
            hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
            hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
          } : undefined
        },
        { status: 500 }
      );
    }

    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await authAdmin.verifyIdToken(token);
    const userId = decodedToken.uid;
    const userName = decodedToken.name || decodedToken.email || 'User';

    // Get request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { taskId, message, bidAmount } = body;

    // Validate required fields
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Check if task exists and is open
    const task = await getTaskPost(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status !== 'open') {
      return NextResponse.json(
        { error: 'Task is not open for applications' },
        { status: 400 }
      );
    }

    // Check if user is the task poster
    if (task.postedBy === userId) {
      return NextResponse.json(
        { error: 'You cannot apply to your own task' },
        { status: 400 }
      );
    }

    // Create application
    const applicationData: Omit<TaskApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
      taskId,
      applicantId: userId,
      applicantName: userName,
      message: message || undefined,
      bidAmount: bidAmount ? Number(bidAmount) : undefined,
    };

    const applicationId = await applyForTask(applicationData);

    return NextResponse.json({
      success: true,
      applicationId,
      message: 'Application submitted successfully',
    });
  } catch (error: any) {
    console.error('Error applying for task:', error.name, error.message, error.code, error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to apply for task', 
        message: error.message || 'An unexpected error occurred',
        code: error.code
      },
      { status: 500 }
    );
  }
}

