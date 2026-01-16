/**
 * API Route: Assign Task to Professional
 * POST /api/tasks/assign
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import {
  updateTaskStatus,
  getTaskPost,
  getTaskApplications,
  updateApplicationStatus,
} from '@/lib/tasks/firestore';
import { getProfessionalProfile } from '@/lib/professionals/firestore';

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
    const { taskId, applicantId } = body;

    // Validate required fields
    if (!taskId || !applicantId) {
      return NextResponse.json(
        { error: 'Task ID and Applicant ID are required' },
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
    console.error('Error assigning task:', error);
    return NextResponse.json(
      { error: 'Failed to assign task', message: error.message },
      { status: 500 }
    );
  }
}

