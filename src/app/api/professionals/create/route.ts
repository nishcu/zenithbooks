/**
 * API Route: Create Professional Profile
 * POST /api/professionals/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createOrUpdateProfessionalProfile } from '@/lib/professionals/firestore';
import type { ProfessionalProfile } from '@/lib/professionals/types';

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
    const {
      fullName,
      firmName,
      qualifications,
      skills,
      experience,
      locations,
      bio,
      phone,
      email,
      website,
    } = body;

    // Validate required fields
    if (!fullName || !qualifications || !skills || experience === undefined || !locations) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create profile data
    const profileData: Omit<ProfessionalProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      fullName,
      firmName: firmName || undefined,
      qualifications: Array.isArray(qualifications) ? qualifications : [qualifications],
      skills: Array.isArray(skills) ? skills : [skills],
      experience: Number(experience),
      locations: Array.isArray(locations) ? locations : [locations],
      bio: bio || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      isVerified: false,
    };

    // Create or update profile
    const profileId = await createOrUpdateProfessionalProfile(userId, profileData);

    return NextResponse.json({
      success: true,
      profileId,
      message: 'Professional profile created successfully',
    });
  } catch (error: any) {
    console.error('Error creating professional profile:', error);
    return NextResponse.json(
      { error: 'Failed to create profile', message: error.message },
      { status: 500 }
    );
  }
}

