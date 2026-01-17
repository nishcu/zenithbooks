/**
 * API Route: Create Task Review
 * POST /api/tasks/review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth, Auth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import {
  createTaskReview,
  getTaskPost,
  getProfessionalReviews,
} from '@/lib/tasks/firestore';
import type { TaskReview } from '@/lib/professionals/types';

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
    const userName = decodedToken.name || decodedToken.email || 'User';

    // Get request body
    const body = await request.json();
    const { taskId, professionalId, rating, comment } = body;

    // Validate required fields
    if (!taskId || !professionalId || !rating || !comment) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if task exists and is completed
    const task = await getTaskPost(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Task must be completed before reviewing' },
        { status: 400 }
      );
    }

    // Check if user is the task poster
    if (task.postedBy !== userId) {
      return NextResponse.json(
        { error: 'Only the task poster can leave reviews' },
        { status: 403 }
      );
    }

    // Check if professional is assigned
    if (task.assignedTo !== professionalId) {
      return NextResponse.json(
        { error: 'Professional ID does not match assigned professional' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReviews = await getProfessionalReviews(professionalId);
    const existingReview = existingReviews.find((r) => r.taskId === taskId && r.reviewerId === userId);
    
    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this task' },
        { status: 400 }
      );
    }

    // Get professional name
    const professionalName = task.assignedToName || 'Professional';

    // Create review
    const reviewData: Omit<TaskReview, 'id' | 'createdAt'> = {
      taskId,
      reviewerId: userId,
      reviewerName: userName,
      professionalId,
      professionalName,
      rating: Number(rating),
      comment: comment.trim(),
    };

    const reviewId = await createTaskReview(reviewData);

    // TODO: Update professional rating calculation can be done via aggregation
    // Professional rating will be calculated from reviews when needed

    return NextResponse.json({
      success: true,
      reviewId,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    console.error('Error creating review:', error.name, error.message, error.code);
    return NextResponse.json(
      { error: 'Failed to create review', message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

