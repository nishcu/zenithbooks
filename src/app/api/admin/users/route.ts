import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE } from "@/lib/firebase-admin";
import { SUPER_ADMIN_UID } from "@/lib/constants";

// Get super admin UID from environment or fallback to constant
const superAdminUid = process.env.SUPER_ADMIN_UID || SUPER_ADMIN_UID;

// Ensure this route is included in the build
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch all users (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // For now, we authorize via x-user-id header (same as PUT/DELETE).
    // In a real implementation, you'd verify the Firebase ID token (Bearer JWT).
    const userId = request.headers.get('x-user-id');
    if (!userId || userId !== superAdminUid) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Fetch all users (requires Firebase Admin env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }
    const usersSnapshot = await db.collection('users').get();

    const users = usersSnapshot.docs.map((d) => {
      const data = d.data();
      const rawCreatedAt = data.createdAt;
      let createdAt: string | null = null;
      if (rawCreatedAt) {
        if (typeof rawCreatedAt.toDate === 'function') {
          createdAt = rawCreatedAt.toDate().toISOString();
        } else if (typeof rawCreatedAt === 'object' && (rawCreatedAt.seconds != null || (rawCreatedAt as { _seconds?: number })._seconds != null)) {
          const sec = rawCreatedAt.seconds ?? (rawCreatedAt as { _seconds: number })._seconds;
          createdAt = new Date(sec * 1000).toISOString();
        } else if (typeof rawCreatedAt === 'string') {
          createdAt = rawCreatedAt;
        }
      }
      return {
        id: d.id,
        email: data.email || '',
        userType: data.userType || 'business',
        companyName: data.companyName || '',
        createdAt,
        // Note: We don't expose sensitive data like passwords
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

/**
 * PUT - Update user information (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId || userId !== superAdminUid) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { targetUserId, updates } = await request.json();

    if (!targetUserId || !updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }
    await db.collection('users').doc(targetUserId).update({
      ...updates,
      updatedAt: new Date(),
      updatedBy: userId,
    });

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

/**
 * DELETE - Delete user (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId || userId !== superAdminUid) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing target user ID" }, { status: 400 });
    }

    // Prevent deleting super admin
    if (targetUserId === superAdminUid) {
      return NextResponse.json({ error: "Cannot delete super admin account" }, { status: 403 });
    }

    const db = getAdminFirestore();
    if (!db) {
      return NextResponse.json({ error: FIREBASE_ADMIN_NOT_CONFIGURED_MESSAGE }, { status: 503 });
    }
    await db.collection('users').doc(targetUserId).delete();

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
