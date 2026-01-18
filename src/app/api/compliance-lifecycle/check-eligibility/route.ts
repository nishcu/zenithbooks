/**
 * API Route: Check Plan Eligibility
 * Evaluates business data and returns recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { performEligibilityCheck } from '@/lib/compliance-lifecycle';

export async function POST(request: NextRequest) {
  try {
    // This API can be called internally or with userId in body
    // Authentication is handled by the caller

    const body = await request.json();
    const { userId, firmId, businessData } = body;

    if (!userId || !firmId || !businessData) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, firmId, businessData' },
        { status: 400 }
      );
    }

    // Perform eligibility check
    const recommendationIds = await performEligibilityCheck(
      userId,
      firmId,
      businessData
    );

    return NextResponse.json({
      success: true,
      recommendationIds,
      count: recommendationIds.length,
      message: `${recommendationIds.length} recommendation(s) generated.`,
    });
  } catch (error: any) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

