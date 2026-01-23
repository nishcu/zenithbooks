/**
 * Organization and Role Utilities
 * 
 * Helper functions for working with organization data, roles, and permissions
 */

import { auth, db } from "@/lib/firebase";
import { doc, getDoc, query, collection, where, Query } from "firebase/firestore";
import { User } from "firebase/auth";

export interface UserOrganizationData {
  uid: string;
  organizationId: string | null;
  clientId: string | null;
  role: string | null;
  userType: string | null;
}

/**
 * Get user's organization data from Firestore
 */
export async function getUserOrganizationData(user: User | null): Promise<UserOrganizationData | null> {
  if (!user) return null;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    return {
      uid: user.uid,
      organizationId: userData?.organizationId || null,
      clientId: userData?.clientId || null,
      role: userData?.role || null,
      userType: userData?.userType || null,
    };
  } catch (error) {
    console.error("Error fetching user organization data:", error);
    return null;
  }
}

/**
 * Build a query that filters by userId OR organizationId
 * Supports backward compatibility (userId) and organization access (organizationId)
 * Also supports client-specific filtering when clientId is set
 */
export function buildOrganizationQuery(
  collectionName: string,
  user: User | null,
  orgData: UserOrganizationData | null
): Query | null {
  if (!user) return null;

  const collectionRef = collection(db, collectionName);

  // If user has organizationId, query by organizationId
  // Otherwise, query by userId (backward compatibility)
  if (orgData?.organizationId) {
    // If user has clientId restriction, add that filter too
    if (orgData.clientId) {
      // Client-specific: only show data for this specific client
      return query(
        collectionRef,
        where("organizationId", "==", orgData.organizationId),
        where("clientId", "==", orgData.clientId)
      );
    } else {
      // Organization-wide: show all organization data (no clientId filter)
      // This includes data with clientId (for other clients) and data without clientId (organization-wide)
      return query(
        collectionRef,
        where("organizationId", "==", orgData.organizationId)
      );
    }
  } else {
    // Backward compatibility: query by userId
    return query(collectionRef, where("userId", "==", user.uid));
  }
}

/**
 * Get data to include when creating documents
 * Includes userId (for backward compatibility) and organizationId (for sharing)
 */
export function getDocumentData(user: User | null, orgData: UserOrganizationData | null): {
  userId: string;
  organizationId: string | null;
  clientId: string | null;
} {
  if (!user) {
    throw new Error("User is required to create documents");
  }

  return {
    userId: user.uid,
    organizationId: orgData?.organizationId || null,
    clientId: orgData?.clientId || null,
  };
}

/**
 * Role permissions configuration
 */
export const ROLE_PERMISSIONS = {
  admin: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canManageUsers: true,
    canAccessSettings: true,
    canAccessAccounting: true,
    canAccessBilling: true,
  },
  accountant: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    canAccessSettings: false,
    canAccessAccounting: true,
    canAccessBilling: true,
  },
  sales: {
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: false,
    canManageUsers: false,
    canAccessSettings: false,
    canAccessAccounting: false,
    canAccessBilling: true,
  },
  viewer: {
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canAccessSettings: false,
    canAccessAccounting: true,
    canAccessBilling: true,
  },
} as const;

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: string | null | undefined) {
  if (!role || !(role in ROLE_PERMISSIONS)) {
    // Default to viewer permissions if role is invalid
    return ROLE_PERMISSIONS.viewer;
  }
  return ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS];
}

