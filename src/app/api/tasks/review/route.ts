/**
 * API Route: Create Task Review
 * POST /api/tasks/review
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
  createTaskReview,
  getTaskPost,
  getProfessionalReviews,
  updateProfessionalRating,
} from '@/lib/tasks/firestore';
import type { TaskReview } from '@/lib/professionals/types';

// Initialize Firebase Admin if needed
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
    // Get auth token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decodedToken = await getAuth().verifyIdToken(token);
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

    // Update professional rating
    await updateProfessionalRating(professionalId, Number(rating));

    return NextResponse.json({
      success: true,
      reviewId,
      message: 'Review submitted successfully',
    });
  } catch (error: any) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review', message: error.message },
      { status: 500 }
    );
  }
}

