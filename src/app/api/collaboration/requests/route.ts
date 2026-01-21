/**
 * API Route: Get Collaboration Requests
 * GET /api/collaboration/requests
 * 
 * Returns collaboration requests where user's firm is:
 * - The requesting firm (requestedByFirmId)
 * - OR in the invitedFirmIds array
 */

import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/lib/tasks/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract filters from query params
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') as 'open' | 'assigned' | 'completed' | 'cancelled' | undefined || 'open';
    const category = searchParams.get('category') || undefined;
    const state = searchParams.get('state') || undefined;
    const city = searchParams.get('city') || undefined;
    const limitCount = searchParams.get('limit')
      ? Number(searchParams.get('limit'))
      : undefined;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required', success: false },
        { status: 400 }
      );
    }

    // Get user data to extract firmId and userType (combine into one fetch)
    let userFirmId: string | null = null;
    let userType: string | null = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userFirmId = userData?.firmId || userId; // Use userId as firmId if not set (backward compatibility)
        userType = userData?.userType || null;
      } else {
        userFirmId = userId; // Fallback to userId if user doc doesn't exist
      }
    } catch (error: any) {
      // Permission errors are expected in server-side API routes
      // The client SDK doesn't have user auth context server-side
      if (error?.code === 'permission-denied') {
        console.warn('Permission denied fetching user data (expected in server-side API). Using fallback values.');
      } else {
        console.error('Error fetching user data:', error);
      }
      userFirmId = userId; // Fallback to userId on error
      userType = null; // Default to null if we can't fetch
    }

    // Fetch all tasks with filters
    let allTasks: any[] = [];
    try {
      allTasks = await listTasks({
        status,
        category,
        state,
        city,
        limitCount: undefined, // Don't limit yet, we need to filter by firm
      });
    } catch (error: any) {
      console.error('Error fetching tasks in collaboration requests API:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      
      // Handle all FirebaseErrors gracefully
      // Common Firebase error codes:
      // - 'failed-precondition': Missing index
      // - 'permission-denied': Security rules blocking access
      // - 'unavailable': Service temporarily unavailable
      // - 'unauthenticated': User not authenticated
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('Firestore index missing, returning empty results. Please create the required index.');
        allTasks = [];
      } else if (error?.code === 'permission-denied') {
        console.warn('Permission denied accessing tasks. Check Firestore security rules.');
        allTasks = [];
      } else if (error?.code === 'unavailable' || error?.code === 'deadline-exceeded') {
        console.warn('Firestore service temporarily unavailable, returning empty results.');
        allTasks = [];
      } else {
        // For other errors, log but don't crash - return empty array
        console.warn('Unknown error fetching tasks, returning empty results:', error?.code || error?.message);
        allTasks = [];
      }
    }

    // userType is already fetched above, no need to fetch again

    // Filter tasks where user's firm is:
    // 1. The requesting firm (requestedByFirmId or postedBy for backward compatibility)
    // 2. OR in the invitedFirmIds array (for invite-only tasks)
    // 3. OR visibility is 'firm-network' and user is a professional (for firm-network tasks)
    const filteredTasks = allTasks.filter((task) => {
      try {
        const taskData = task as any;
        
        // Check if user's firm is the requesting firm
        const isRequestingFirm = 
          taskData.requestedByFirmId === userFirmId ||
          taskData.requestedByUserId === userId ||
          (task.postedBy && task.postedBy === userId); // Backward compatibility
        
        if (isRequestingFirm) {
          return true; // Always show tasks you created
        }

        // Check visibility
        const visibility = taskData.visibility || 'invite-only';
        
        if (visibility === 'firm-network') {
          // Firm-network tasks are visible to all professionals
          return userType === 'professional';
        } else {
          // Invite-only tasks: check if user's firm is in invitedFirmIds
          const isInvitedFirm = 
            Array.isArray(taskData.invitedFirmIds) &&
            taskData.invitedFirmIds.includes(userFirmId);
          return isInvitedFirm;
        }
      } catch (error) {
        console.error('Error filtering task:', error, task);
        return false; // Skip tasks that cause errors
      }
    });

    // Apply limit after filtering
    const requests = limitCount 
      ? filteredTasks.slice(0, limitCount)
      : filteredTasks;

    return NextResponse.json({
      success: true,
      requests,
      count: requests.length,
    });
  } catch (error: any) {
    console.error('Error listing collaboration requests:', error);
    console.error('Error stack:', error?.stack);
    console.error('Error code:', error?.code);
    console.error('Error name:', error?.name);
    
    // Return more detailed error information in development
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';
    
    return NextResponse.json(
      { 
        error: 'Failed to list collaboration requests', 
        message: errorMessage,
        code: errorCode,
        success: false,
        // Include stack trace in development only
        ...(process.env.NODE_ENV === 'development' && { stack: error?.stack })
      },
      { status: 500 }
    );
  }
}

