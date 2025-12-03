import { NextRequest, NextResponse } from "next/server";

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for vault API routes
 * This helps verify that API routes are working correctly
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    service: "vault-api",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    service: "vault-api",
    method: "POST",
    timestamp: new Date().toISOString(),
  });
}

