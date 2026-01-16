/**
 * API Route: Apply for Task
 * POST /api/tasks/apply
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { applyForTask, getTaskPost } from '@/lib/tasks/firestore';
import type { TaskApplication } from '@/lib/professionals/types';

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
    console.error('Error applying for task:', error);
    return NextResponse.json(
      { error: 'Failed to apply for task', message: error.message },
      { status: 500 }
    );
  }
}

