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

    // Get user data to extract firmId
    let userFirmId: string | null = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        userFirmId = userData?.firmId || userId; // Use userId as firmId if not set (backward compatibility)
      } else {
        userFirmId = userId; // Fallback to userId if user doc doesn't exist
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      userFirmId = userId; // Fallback to userId on error
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
      // If it's an index error, return empty array instead of failing
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('Firestore index missing, returning empty results. Please create the required index.');
        allTasks = [];
      } else {
        throw error; // Re-throw other errors
      }
    }

    // Get user type to determine if they can see firm-network tasks
    let userType: string | null = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        userType = userDoc.data()?.userType || null;
      }
    } catch (error) {
      console.error('Error fetching user type:', error);
    }

    // Filter tasks where user's firm is:
    // 1. The requesting firm (requestedByFirmId or postedBy for backward compatibility)
    // 2. OR in the invitedFirmIds array (for invite-only tasks)
    // 3. OR visibility is 'firm-network' and user is a professional (for firm-network tasks)
    const filteredTasks = allTasks.filter((task) => {
      const taskData = task as any;
      
      // Check if user's firm is the requesting firm
      const isRequestingFirm = 
        taskData.requestedByFirmId === userFirmId ||
        taskData.requestedByUserId === userId ||
        task.postedBy === userId; // Backward compatibility
      
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
    return NextResponse.json(
      { 
        error: 'Failed to list collaboration requests', 
        message: error.message,
        success: false 
      },
      { status: 500 }
    );
  }
}

