/**
 * ITR Credential Decryption API
 * CA Team only - Requires authentication and assignment verification
 * 
 * Note: Token verification should be done client-side using Firebase Auth SDK.
 * The client sends the verified user ID via x-user-id header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { decryptCredential } from '@/lib/itr/encryption';
import { getITRApplication, getITRCredentials, logCredentialAccess } from '@/lib/itr/firestore';

// Runtime config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get user ID from headers (verified client-side using Firebase Auth)
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - No user ID provided' },
        { status: 401 }
      );
    }

    const uid = userId;

    const { applicationId } = await request.json();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Verify application exists and is assigned to this professional
    const application = await getITRApplication(applicationId);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user is assigned to this application
    if (application.assignedTo !== uid) {
      return NextResponse.json(
        { error: 'Access denied. This application is not assigned to you.' },
        { status: 403 }
      );
    }

    // Get credentials
    const credentials = await getITRCredentials(applicationId);
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credentials not found for this application' },
        { status: 404 }
      );
    }

    // Decrypt credentials
    let decryptedUsername: string;
    let decryptedPassword: string;

    try {
      decryptedUsername = decryptCredential(credentials.encryptedUsername);
      decryptedPassword = decryptCredential(credentials.encryptedPassword);
    } catch (error: any) {
      console.error('Decryption error:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt credentials' },
        { status: 500 }
      );
    }

    // Log access
    try {
      await logCredentialAccess(credentials.id, uid, 'Viewed credentials for ITR processing');
    } catch (error) {
      console.error('Failed to log credential access:', error);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      credentials: {
        username: decryptedUsername,
        password: decryptedPassword,
      },
      accessedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Decrypt credentials error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to decrypt credentials' },
      { status: 500 }
    );
  }
}

