/**
 * API Route: Get All Tasks
 * GET /api/tasks/all
 */

import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/lib/tasks/firestore';

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract filters from query params
    const status = searchParams.get('status') as 'open' | 'assigned' | 'completed' | 'cancelled' | undefined;
    const category = searchParams.get('category') || undefined;
    const state = searchParams.get('state') || undefined;
    const city = searchParams.get('city') || undefined;
    const postedBy = searchParams.get('postedBy') || undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const limitCount = searchParams.get('limit')
      ? Number(searchParams.get('limit'))
      : undefined;

    const tasks = await listTasks({
      status,
      category,
      state,
      city,
      postedBy,
      assignedTo,
      limitCount,
    });

    return NextResponse.json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error: any) {
    console.error('Error listing tasks:', error);
    return NextResponse.json(
      { error: 'Failed to list tasks', message: error.message },
      { status: 500 }
    );
  }
}

