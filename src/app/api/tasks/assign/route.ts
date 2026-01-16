/**
 * API Route: Assign Task to Professional
 * POST /api/tasks/assign
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, Auth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import {
  updateTaskStatus,
  getTaskPost,
  getTaskApplications,
  updateApplicationStatus,
} from '@/lib/tasks/firestore';
import { getProfessionalProfile } from '@/lib/professionals/firestore';

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
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid request body', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    const { taskId, applicantId } = body;

    // Validate required fields
    if (!taskId || !applicantId) {
      return NextResponse.json(
        { 
          error: 'Task ID and Applicant ID are required',
          message: `Missing required fields. taskId: ${taskId ? 'provided' : 'missing'}, applicantId: ${applicantId ? 'provided' : 'missing'}`,
          received: { taskId, applicantId }
        },
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

    // Check if user is the task poster
    if (task.postedBy !== userId) {
      return NextResponse.json(
        { error: 'Only the task poster can assign tasks' },
        { status: 403 }
      );
    }

    // Check if task is open
    if (task.status !== 'open') {
      return NextResponse.json(
        { error: 'Task is not open for assignment' },
        { status: 400 }
      );
    }

    // Verify application exists
    const applications = await getTaskApplications(taskId);
    const application = applications.find((app) => app.applicantId === applicantId && app.status === 'pending');
    
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found or already processed' },
        { status: 404 }
      );
    }

    // Get professional name
    const professional = await getProfessionalProfile(applicantId);
    const professionalName = professional?.fullName || 'Professional';

    // Update task status
    await updateTaskStatus(taskId, 'assigned', applicantId, professionalName);

    // Update application status to accepted
    await updateApplicationStatus(application.id, 'accepted');

    // Reject other pending applications
    const otherApplications = applications.filter(
      (app) => app.id !== application.id && app.status === 'pending'
    );
    for (const app of otherApplications) {
      await updateApplicationStatus(app.id, 'rejected');
    }

    return NextResponse.json({
      success: true,
      message: 'Task assigned successfully',
    });
  } catch (error: any) {
    console.error('Error assigning task:', error.name, error.message, error.code);
    return NextResponse.json(
      { error: 'Failed to assign task', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

