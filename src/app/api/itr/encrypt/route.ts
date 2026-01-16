/**
 * ITR Encryption API Endpoint
 * Server-side encryption for credentials
 */

import { NextRequest, NextResponse } from 'next/server';
import { encryptCredential } from '@/lib/itr/encryption';

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    if (!data || typeof data !== 'string') {
      return NextResponse.json(
        { error: 'Invalid data provided' },
        { status: 400 }
      );
    }

    // Encrypt the data
    const encrypted = encryptCredential(data);

    if (!encrypted) {
      console.error('Encryption returned empty result');
      return NextResponse.json(
        { error: 'Encryption failed: Empty result' },
        { status: 500 }
      );
    }

    return NextResponse.json({ encrypted });
  } catch (error: any) {
    console.error('Encryption error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to encrypt data';
    if (error.message?.includes('ITR_ENCRYPTION_KEY')) {
      errorMessage = 'Encryption key not configured. Please set ITR_ENCRYPTION_KEY environment variable.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

