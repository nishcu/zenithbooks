/**
 * API Route: Create Task Post
 * POST /api/tasks/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createTaskPost } from '@/lib/tasks/firestore';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TaskPost, CollaborationRequest } from '@/lib/professionals/types';
import { notifyTaskInvitation, notifyFirmNetworkTask } from '@/lib/tasks/notifications';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Firebase Admin if needed
let adminInitialized = false;
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
  // App already exists
  adminInitialized = true;
}

// Helper function to ensure Admin is initialized
function ensureAdminInitialized() {
  if (!adminInitialized && getApps().length === 0) {
    throw new Error('Firebase Admin is not initialized. Please check environment variables: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure Firebase Admin is initialized
    try {
      ensureAdminInitialized();
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
    
    // Get Firebase Admin auth
    const authAdmin = getAuth();
    
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

    // Get user data to extract firmId
    // For principal model: Task ownership is always ZenithBooks platform
    // User's firm is stored as requesting firm
    const userDoc = await getDoc(doc(db, 'users', userId)).catch(() => null);
    const userData = userDoc?.data();
    const firmId = userData?.firmId || userId; // Use userId as firmId if not set (backward compatibility)
    const firmName = userData?.companyName || userData?.firmName || userName;

    // Create collaboration request data (principal model - always owned by platform)
    const taskData: Omit<TaskPost, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
      // Legacy fields for backward compatibility
      postedBy: userId,
      postedByName: userName,
      // New firm-based fields (principal model)
      requestedByFirmId: firmId,
      requestedByFirmName: firmName,
      requestedByUserId: userId,
      category,
      title,
      description,
      location,
      state: state || undefined,
      city: city || undefined,
      onSite: Boolean(onSite),
      // REMOVED: budget (price discovery violates ICAI)
      visibility: body.visibility || 'invite-only',
      invitedFirmIds: body.invitedFirmIds || [],
      deadline: Timestamp.fromDate(deadlineDate),
      professionalResponsibility: 'requesting_firm', // ICAI compliance
      feeSettlement: 'off-platform', // ICAI compliance
    };

    // Create task - wrap in try-catch to get detailed error
    let taskId;
    try {
      taskId = await createTaskPost(taskData);
    } catch (createError: any) {
      console.error('Error in createTaskPost:', createError);
      console.error('Error stack:', createError?.stack);
      console.error('Error code:', createError?.code);
      throw createError; // Re-throw to be caught by outer catch
    }

    // Send notifications based on visibility
    try {
      if (taskData.visibility === 'invite-only' && taskData.invitedFirmIds && taskData.invitedFirmIds.length > 0) {
        // Notify invited firms
        await notifyTaskInvitation(
          taskId,
          taskData.title,
          firmName,
          taskData.invitedFirmIds
        );
      } else if (taskData.visibility === 'firm-network') {
        // Notify all professionals in the network
        await notifyFirmNetworkTask(
          taskId,
          taskData.title,
          firmName,
          taskData.category
        );
      }
    } catch (notifyError) {
      console.error('Error sending notifications (non-critical):', notifyError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Task created successfully',
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    console.error('Error name:', error?.name);
    console.error('Error message:', error?.message);
    console.error('Error code:', error?.code);
    console.error('Error stack:', error?.stack);
    
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorCode = error?.code || error?.name || 'UNKNOWN_ERROR';
    
    return NextResponse.json(
      { 
        error: 'Failed to create task', 
        message: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
          fullError: error?.toString()
        } : undefined
      },
      { status: 500 }
    );
  }
}

