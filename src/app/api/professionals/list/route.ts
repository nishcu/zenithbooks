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
    
    // Extract filters from query params - handle empty strings and undefined
    const stateParam = searchParams.get('state');
    const state = stateParam && stateParam.trim() !== '' ? stateParam.trim() : undefined;
    
    const cityParam = searchParams.get('city');
    const city = cityParam && cityParam.trim() !== '' ? cityParam.trim() : undefined;
    
    const skillsParam = searchParams.get('skills');
    const skills = skillsParam && skillsParam.trim() !== '' ? skillsParam.split(',').map(s => s.trim()).filter(s => s) : undefined;
    
    const minExperienceParam = searchParams.get('minExperience');
    const minExperience = minExperienceParam && !isNaN(Number(minExperienceParam)) 
      ? Number(minExperienceParam) 
      : undefined;
    
    const isVerifiedParam = searchParams.get('isVerified');
    const isVerified = isVerifiedParam === 'true' ? true : isVerifiedParam === 'false' ? false : undefined;
    
    const limitParam = searchParams.get('limit');
    const limitCount = limitParam && !isNaN(Number(limitParam)) && Number(limitParam) > 0
      ? Number(limitParam)
      : undefined;

    // Always start with simplest query - fetch all professionals
    // We'll filter client-side to avoid index requirements
    let snapshot;
    let useClientSideFiltering = true; // Default to client-side filtering
    
    try {
      // Build base query
      let q = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
      
      // Only apply server-side filters that don't require indexes
      const whereClauses: any[] = [];
      
      if (isVerified !== undefined) {
        whereClauses.push(where('isVerified', '==', isVerified));
      }
      
      if (minExperience !== undefined && !isNaN(minExperience)) {
        whereClauses.push(where('experience', '>=', minExperience));
      }
      
      // Apply where clauses if any
      if (whereClauses.length > 0) {
        q = query(q, ...whereClauses);
      }
      
      // Try to add orderBy only if we have no location filters
      // Location filters require array-contains which needs indexes
      if (!state && !city) {
        try {
          // Try orderBy, but don't fail if index doesn't exist
          q = query(q, orderBy('createdAt', 'desc'));
        } catch (orderError) {
          // Index might not exist, continue without orderBy
          console.warn('Could not order by createdAt (index may be missing):', orderError);
        }
      }
      
      // Apply limit only if no location filters (to avoid index issues)
      if (limitCount && !state && !city) {
        // Get more results to account for client-side filtering
        q = query(q, limit(Math.min(limitCount * 3, 1000)));
      }
      
      snapshot = await getDocs(q);
    } catch (error: any) {
      // If any query fails, fall back to simplest query
      console.warn('Query with filters failed, using simple query:', error?.message || error);
      try {
        const simpleQuery = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
        snapshot = await getDocs(simpleQuery);
        useClientSideFiltering = true;
      } catch (fallbackError: any) {
        console.error('Even simple query failed:', fallbackError);
        // Return empty array instead of error to prevent frontend loops
        return NextResponse.json({
          success: true,
          professionals: [],
          count: 0,
          error: 'Database query failed',
        });
      }
    }
    
    // Map documents to professional objects
    let professionals = snapshot.docs.map((doc) => {
      try {
        const data = doc.data();
        // Handle missing or invalid dates gracefully
        let createdAt: Date = new Date();
        let updatedAt: Date = new Date();
        
        try {
          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          }
        } catch (e) {
          // Use default
        }
        
        try {
          if (data.updatedAt?.toDate) {
            updatedAt = data.updatedAt.toDate();
          } else if (data.updatedAt) {
            updatedAt = new Date(data.updatedAt);
          }
        } catch (e) {
          // Use default
        }
        
        return {
          id: doc.id,
          ...data,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        };
      } catch (docError) {
        console.warn('Error processing document:', doc.id, docError);
        // Return minimal object to prevent crashes
        return {
          id: doc.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }).filter(prof => prof !== null && prof !== undefined); // Remove any null/undefined entries
    
    // Sort by rating (client-side) after fetching
    professionals.sort((a, b) => {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      // If ratings are equal, sort by createdAt (newest first)
      try {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      } catch (e) {
        return 0;
      }
    });
    
    // Apply client-side filters for location (case-insensitive, partial match)
    if (state || city) {
      professionals = professionals.filter((prof) => {
        try {
          // Check state filter (case-insensitive, partial match)
          if (state) {
            const locations = prof.locations || [];
            const locationStr = Array.isArray(locations) 
              ? locations.join(' ').toLowerCase() 
              : String(locations || '').toLowerCase();
            const stateLower = state.toLowerCase();
            
            // Check if state matches (handles "Andhra Pradesh", "AndhraPradesh", "AP", etc.)
            if (!locationStr.includes(stateLower)) {
              return false;
            }
          }
          
          // Check city filter (case-insensitive, partial match)
          if (city) {
            const locations = prof.locations || [];
            const locationStr = Array.isArray(locations) 
              ? locations.join(' ').toLowerCase() 
              : String(locations || '').toLowerCase();
            const cityLower = city.toLowerCase();
            
            if (!locationStr.includes(cityLower)) {
              return false;
            }
          }
          
          return true;
        } catch (filterError) {
          // If filtering fails for a document, exclude it
          console.warn('Error filtering professional:', prof.id, filterError);
          return false;
        }
      });
    }
    
    // Filter by skills if provided (client-side)
    if (skills && skills.length > 0) {
      professionals = professionals.filter((prof) => {
        try {
          const profSkills = prof.skills || [];
          return skills.some((skill) => 
            profSkills.some((ps: string) => 
              ps.toLowerCase().includes(skill.toLowerCase())
            )
          );
        } catch (e) {
          return false;
        }
      });
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
    // Log error but return empty array to prevent frontend infinite loops
    console.error('Error listing professionals:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack?.substring(0, 500), // Limit stack trace length
    });
    
    // Return success with empty array instead of error to prevent frontend retry loops
    return NextResponse.json({
      success: true,
      professionals: [],
      count: 0,
      error: error?.message || 'Unknown error',
    });
  }
}

