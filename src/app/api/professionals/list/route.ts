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
    // For now, fetch all and filter client-side to avoid index issues
    let q = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
    
    // Try to apply filters, but if they fail, we'll filter client-side
    let useClientSideFiltering = false;
    let snapshot;
    
    try {
      // Try to apply server-side filters
      if (isVerified !== undefined) {
        q = query(q, where('isVerified', '==', isVerified));
      }
      
      // Don't use array-contains for locations (requires index)
      // We'll filter client-side instead
      
      if (minExperience) {
        q = query(q, where('experience', '>=', minExperience));
      }
      
      // Only add orderBy if no where clauses (to avoid index requirement)
      const hasWhereClauses = isVerified !== undefined || minExperience;
      if (!hasWhereClauses) {
        try {
          q = query(q, orderBy('createdAt', 'desc'));
        } catch (orderError) {
          // If orderBy fails, continue without it
          console.warn('Could not order by createdAt:', orderError);
        }
      }
      
      if (limitCount && !state && !city) {
        // Only use limit if no location filters (to avoid index issues)
        q = query(q, limit(limitCount * 2)); // Get more to account for client-side filtering
      }
      
      snapshot = await getDocs(q);
    } catch (error: any) {
      // If query fails, try simplest query and filter client-side
      console.warn('Query with filters failed, falling back to simple query:', error);
      try {
        q = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
        snapshot = await getDocs(q);
        useClientSideFiltering = true;
      } catch (fallbackError: any) {
        console.error('Even simple query failed:', fallbackError);
        throw new Error(`Failed to query professionals: ${fallbackError?.message || 'Unknown error'}`);
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
    
    // Apply client-side filters for location (to avoid index requirements)
    if (useClientSideFiltering || state || city) {
      professionals = professionals.filter((prof) => {
        // Check state filter
        if (state) {
          const locations = prof.locations || [];
          const locationStr = Array.isArray(locations) ? locations.join(' ') : String(locations || '');
          if (!locationStr.toLowerCase().includes(state.toLowerCase())) {
            return false;
          }
        }
        
        // Check city filter
        if (city) {
          const locations = prof.locations || [];
          const locationStr = Array.isArray(locations) ? locations.join(' ') : String(locations || '');
          if (!locationStr.toLowerCase().includes(city.toLowerCase())) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // Filter by skills if provided (client-side)
    if (skills && skills.length > 0) {
      professionals = professionals.filter((prof) =>
        skills.some((skill) => prof.skills?.includes(skill))
      );
    }
    
    // Apply limit after client-side filtering
    if (limitCount && professionals.length > limitCount) {
      professionals = professionals.slice(0, limitCount);
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

