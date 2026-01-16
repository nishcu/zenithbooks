/**
 * WhatsApp Notification API Endpoint
 * Sends WhatsApp messages using Twilio or other WhatsApp Business API
 * 
 * For production, integrate with:
 * - Twilio WhatsApp API
 * - WhatsApp Business API
 * - Other WhatsApp Business solutions
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: 'to and message are required' },
        { status: 400 }
      );
    }

    // Format phone number (remove +, spaces, etc.)
    const formattedPhone = to.replace(/[^\d]/g, '');

    // Check if WhatsApp API is configured
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;

    if (!whatsappApiKey || !whatsappApiUrl) {
      console.warn('WhatsApp API not configured. Notification logged only.');
      
      // Log notification for debugging (in production, you might want to queue it)
      console.log('WhatsApp Notification (not sent):', {
        to: formattedPhone,
        message,
      });

      return NextResponse.json({
        success: true,
        message: 'WhatsApp notification logged (API not configured)',
        note: 'Configure WHATSAPP_API_KEY and WHATSAPP_API_URL to enable WhatsApp notifications',
      });
    }

    // Example: Twilio WhatsApp API integration
    // Uncomment and configure for Twilio:
    /*
    const twilioClient = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const twilioResponse = await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:+91${formattedPhone}`,
      body: message,
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notification sent successfully',
      sid: twilioResponse.sid,
    });
    */

    // Generic API call (for other WhatsApp Business API providers)
    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${whatsappApiKey}`,
      },
      body: JSON.stringify({
        to: formattedPhone,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send WhatsApp message');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp notification sent successfully',
      data,
    });
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp message' },
      { status: 500 }
    );
  }
}

