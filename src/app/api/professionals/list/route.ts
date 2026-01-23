/**
 * API Route: List Professionals
 * GET /api/professionals/list
 */

import { NextRequest, NextResponse } from 'next/server';
import { listProfessionals } from '@/lib/professionals/firestore';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract filters from query params
    const state = searchParams.get('state') || undefined;
    const city = searchParams.get('city') || undefined;
    const skillsParam = searchParams.get('skills');
    const skills = skillsParam ? skillsParam.split(',') : undefined;
    const minExperience = searchParams.get('minExperience')
      ? Number(searchParams.get('minExperience'))
      : undefined;
    const isVerified = searchParams.get('isVerified')
      ? searchParams.get('isVerified') === 'true'
      : undefined;
    const limitCount = searchParams.get('limit')
      ? Number(searchParams.get('limit'))
      : undefined;

    const professionals = await listProfessionals({
      state,
      city,
      skills,
      minExperience,
      isVerified,
      limitCount,
    });

    return NextResponse.json({
      success: true,
      professionals,
      count: professionals.length,
    });
  } catch (error: any) {
    console.error('Error listing professionals:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { 
        error: 'Failed to list professionals', 
        message: error?.message || 'Unknown error',
        code: error?.code || 'unknown',
      },
      { status: 500 }
    );
  }
}

