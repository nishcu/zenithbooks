/**
 * API Route: List Professionals
 * GET /api/professionals/list
 * 
 * Note: This route uses direct Firestore queries to avoid authentication context issues
 * in server-side API routes. The client SDK doesn't have user context in server-side code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COLLECTIONS = {
  PROFESSIONALS_PROFILES: 'professionals_profiles',
};

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

    // Build query directly in API route to avoid auth context issues
    let q = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
    
    // Apply filters
    if (state) {
      q = query(q, where('locations', 'array-contains', state));
    }
    
    if (city) {
      q = query(q, where('locations', 'array-contains', city));
    }
    
    if (isVerified !== undefined) {
      q = query(q, where('isVerified', '==', isVerified));
    }
    
    if (minExperience) {
      q = query(q, where('experience', '>=', minExperience));
    }
    
    // Only add orderBy if no where clauses (to avoid index requirement)
    const hasWhereClauses = state || city || isVerified !== undefined || minExperience;
    if (!hasWhereClauses) {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    let snapshot;
    try {
      snapshot = await getDocs(q);
    } catch (error: any) {
      // If query fails due to missing index, try without orderBy
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('Query failed due to missing index, retrying without orderBy:', error);
        // Rebuild query without orderBy
        let fallbackQ = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
        if (state) {
          fallbackQ = query(fallbackQ, where('locations', 'array-contains', state));
        }
        if (city) {
          fallbackQ = query(fallbackQ, where('locations', 'array-contains', city));
        }
        if (isVerified !== undefined) {
          fallbackQ = query(fallbackQ, where('isVerified', '==', isVerified));
        }
        if (minExperience) {
          fallbackQ = query(fallbackQ, where('experience', '>=', minExperience));
        }
        if (limitCount) {
          fallbackQ = query(fallbackQ, limit(limitCount));
        }
        snapshot = await getDocs(fallbackQ);
      } else {
        throw error;
      }
    }
    
    let professionals = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Handle missing createdAt gracefully
      let createdAt: Date;
      let updatedAt: Date;
      try {
        createdAt = data.createdAt?.toDate() || new Date();
        updatedAt = data.updatedAt?.toDate() || new Date();
      } catch (error) {
        createdAt = new Date();
        updatedAt = new Date();
      }
      return {
        id: doc.id,
        ...data,
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      };
    });
    
    // Sort by rating (client-side) after fetching
    professionals.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      // If ratings are equal, sort by createdAt (newest first)
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
    
    // Filter by skills if provided (client-side)
    if (skills && skills.length > 0) {
      professionals = professionals.filter((prof) =>
        skills.some((skill) => prof.skills?.includes(skill))
      );
    }

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

