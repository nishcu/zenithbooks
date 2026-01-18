/**
 * API Route: Trigger Compliance Event
 * Allows existing modules to trigger compliance events without breaking
 */

import { NextRequest, NextResponse } from 'next/server';
import { processComplianceEvent, getEntityTypeForUser } from '@/lib/compliance-lifecycle';

export async function POST(request: NextRequest) {
  try {
    // This API can be called internally or with userId in body
    // Authentication is handled by the caller

    const body = await request.json();
    const { eventType, eventData, userId, firmId } = body;

    if (!eventType || !userId || !firmId) {
      return NextResponse.json(
        { error: 'Missing required fields: eventType, userId, firmId' },
        { status: 400 }
      );
    }

    // Get entity type
    const entityType = await getEntityTypeForUser(userId, firmId);
    if (!entityType) {
      return NextResponse.json(
        { error: 'Could not determine entity type' },
        { status: 400 }
      );
    }

    // Process compliance event
    const taskIds = await processComplianceEvent(
      userId,
      firmId,
      eventType,
      eventData || {},
      entityType
    );

    return NextResponse.json({
      success: true,
      taskIds,
      message: `Compliance event processed. ${taskIds.length} task(s) created.`,
    });
  } catch (error: any) {
    console.error('Error processing compliance event:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

