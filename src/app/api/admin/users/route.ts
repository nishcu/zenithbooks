import { NextRequest, NextResponse } from "next/server";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
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
    // Check if user is authenticated and is super admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, we'll check the user ID from the request
    // In a real implementation, you'd verify the JWT token
    const userId = request.headers.get('x-user-id');
    if (!userId || userId !== superAdminUid) {
      return NextResponse.json({ error: "Forbidden - Admin access required" }, { status: 403 });
    }

    // Fetch all users
    const usersCollection = collection(db, 'users');
    const usersSnapshot = await getDocs(usersCollection);

    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email || '',
        userType: data.userType || 'business',
        companyName: data.companyName || '',
        createdAt: data.createdAt,
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

    const userRef = doc(db, 'users', targetUserId);
    await updateDoc(userRef, {
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

    const userRef = doc(db, 'users', targetUserId);
    await deleteDoc(userRef);

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
