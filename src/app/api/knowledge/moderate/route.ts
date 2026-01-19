/**
 * API Route: Moderate Knowledge Posts
 * Admin only - for reviewing and moderating posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { updateKnowledgePostStatus } from '@/lib/knowledge/firestore';
import { SUPER_ADMIN_UID } from '@/lib/constants';

// Initialize Firebase Admin if needed
let adminInitialized = false;
if (!getApps().length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
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
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const authAdmin = getAuth();
    const decodedToken = await authAdmin.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Check if user is admin
    if (userId !== SUPER_ADMIN_UID) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { postId, status, notes } = body;

    if (!postId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields', message: 'postId and status are required' },
        { status: 400 }
      );
    }

    await updateKnowledgePostStatus(postId, status, userId, notes);

    return NextResponse.json({
      success: true,
      message: 'Post status updated successfully',
    });
  } catch (error: any) {
    console.error('Error moderating post:', error);
    return NextResponse.json(
      { error: 'Failed to moderate post', message: error.message },
      { status: 500 }
    );
  }
}

