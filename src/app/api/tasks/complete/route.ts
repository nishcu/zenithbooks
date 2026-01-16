/**
 * API Route: Complete Task
 * POST /api/tasks/complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { updateTaskStatus, getTaskPost } from '@/lib/tasks/firestore';

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
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task', message: error.message },
      { status: 500 }
    );
  }
}

