/**
 * API Route: Create Professional Profile
 * POST /api/professionals/create
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { createOrUpdateProfessionalProfile } from '@/lib/professionals/firestore';
import type { ProfessionalProfile } from '@/lib/professionals/types';

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

    // Validate required fields - check for empty strings, empty arrays, and invalid numbers
    if (
      !fullName || 
      typeof fullName !== 'string' || 
      !fullName.trim() ||
      !Array.isArray(qualifications) || 
      qualifications.length === 0 ||
      !Array.isArray(skills) || 
      skills.length === 0 ||
      experience === undefined || 
      experience === null || 
      isNaN(Number(experience)) ||
      Number(experience) < 0 ||
      !Array.isArray(locations) || 
      locations.length === 0
    ) {
      return NextResponse.json(
        { error: 'Please enter all required fields' },
        { status: 400 }
      );
    }

    // Create profile data - trim all string fields
    const profileData: Omit<ProfessionalProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
      fullName: fullName.trim(),
      firmName: firmName?.trim() || undefined,
      qualifications: Array.isArray(qualifications) ? qualifications : [qualifications],
      skills: Array.isArray(skills) ? skills : [skills],
      experience: Number(experience),
      locations: Array.isArray(locations) ? locations : [locations],
      bio: bio?.trim() || undefined,
      phone: phone?.trim() || undefined,
      email: email?.trim() || undefined,
      website: website?.trim() || undefined,
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

