/**
 * API Route: Create Task Post
 * POST /api/tasks/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createTaskPost } from '@/lib/tasks/firestore';
import { Timestamp } from 'firebase/firestore';
import type { TaskPost } from '@/lib/professionals/types';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin if needed
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
    }
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
        { error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Verify Firebase Admin is initialized
    let authAdmin;
    try {
      authAdmin = getAuth();
    } catch (error) {
      console.error('Firebase Admin not initialized:', error);
      return NextResponse.json(
        { error: 'Server configuration error', message: 'Authentication service not available' },
        { status: 500 }
      );
    }
    
    const decodedToken = await authAdmin.verifyIdToken(token);
    const userId = decodedToken.uid;
    const userName = decodedToken.name || decodedToken.email || 'User';

    // Get request body
    const body = await request.json();
    const {
      category,
      title,
      description,
      location,
      state,
      city,
      onSite,
      budget,
      deadline,
    } = body;

    // Validate required fields
    if (!category || !title || !description || !location || onSite === undefined || !deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Parse deadline
    const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid deadline date' },
        { status: 400 }
      );
    }

    // Create task data
    const taskData: Omit<TaskPost, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
      postedBy: userId,
      postedByName: userName,
      category,
      title,
      description,
      location,
      state: state || undefined,
      city: city || undefined,
      onSite: Boolean(onSite),
      budget: budget ? Number(budget) : undefined,
      deadline: Timestamp.fromDate(deadlineDate),
    };

    // Create task
    const taskId = await createTaskPost(taskData);

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Task created successfully',
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorCode = error?.code || 'UNKNOWN_ERROR';
    
    return NextResponse.json(
      { 
        error: 'Failed to create task', 
        message: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}

