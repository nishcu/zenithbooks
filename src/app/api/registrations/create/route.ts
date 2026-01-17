/**
 * API Route: Create Business Registration
 * POST /api/registrations/create
 */

import { NextRequest, NextResponse } from "next/server";
import { createBusinessRegistration } from "@/lib/business-registrations/firestore";
import { getRegistrationConfig } from "@/lib/business-registrations/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, registrationType, businessName, businessType, pan, address } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 401 });
    }

    if (!registrationType) {
      return NextResponse.json(
        { error: "Registration type is required" },
        { status: 400 }
      );
    }

    const config = getRegistrationConfig(registrationType);
    const firmId = userId; // For now, use userId as firmId

    const registrationId = await createBusinessRegistration({
      userId: body.userId || userId,
      firmId,
      registrationType,
      businessName,
      businessType,
      pan,
      address,
      documents: [],
      feeAmount: config.basePrice,
      feePaid: false,
      createdBy: body.userId || userId,
    });

    return NextResponse.json({
      success: true,
      registrationId,
      message: "Registration request created successfully",
    });
  } catch (error: any) {
    console.error("Error creating registration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create registration" },
      { status: 500 }
    );
  }
}

