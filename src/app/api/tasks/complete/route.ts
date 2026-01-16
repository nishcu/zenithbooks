/**
 * API Route: Complete Task
 * POST /api/tasks/complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, Auth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { updateTaskStatus, getTaskPost } from '@/lib/tasks/firestore';

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

function ensureAdminInitialized(): Auth {
  if (!adminInitialized || !firebaseAdminApp) {
    throw new Error('Firebase Admin is not initialized. Please check environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
  return getAuth(firebaseAdminApp);
}

export async function POST(request: NextRequest) {
  try {
    let authAdmin: Auth;
    try {
      authAdmin = ensureAdminInitialized();
    } catch (initError: any) {
      console.error('Firebase Admin initialization check failed:', initError);
      return NextResponse.json(
        { 
          error: 'Server configuration error', 
          message: initError.message || 'Firebase Admin is not properly configured.',
        },
        { status: 500 }
      );
    }

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

    // Get request body
    const body = await request.json();
    const { taskId } = body;

    // Validate required fields
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Check if task exists
    const task = await getTaskPost(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Check if user is authorized (task poster or assigned professional)
    if (task.postedBy !== userId && task.assignedTo !== userId) {
      return NextResponse.json(
        { error: 'You are not authorized to complete this task' },
        { status: 403 }
      );
    }

    // Check if task is assigned
    if (task.status !== 'assigned') {
      return NextResponse.json(
        { error: 'Task must be assigned before completion' },
        { status: 400 }
      );
    }

    // Update task status
    await updateTaskStatus(taskId, 'completed');

    return NextResponse.json({
      success: true,
      message: 'Task marked as completed',
    });
  } catch (error: any) {
    console.error('Error completing task:', error.name, error.message, error.code);
    return NextResponse.json(
      { error: 'Failed to complete task', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

