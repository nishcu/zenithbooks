/**
 * ITR Notification API Endpoint
 * Sends notifications (email and WhatsApp) for ITR events
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendITRNotification } from '@/lib/itr/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, applicationId, type, ...context } = body;

    if (!userId || !type) {
      return NextResponse.json(
        { error: 'userId and type are required' },
        { status: 400 }
      );
    }

    // Send notification
    await sendITRNotification({
      userId,
      applicationId,
      type,
      ...context,
    });

    return NextResponse.json({
      success: true,
      message: 'Notification sent successfully',
    });
  } catch (error: any) {
    console.error('Notification API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}

