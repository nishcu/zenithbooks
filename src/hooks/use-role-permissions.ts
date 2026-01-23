"use client";

import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { auth, db } from "@/lib/firebase";
import { doc } from "firebase/firestore";
import { getRolePermissions } from "@/lib/organization-utils";

/**
 * Hook to get role-based permissions for the current user
 */
export function useRolePermissions() {
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);

  const role = userData?.role || null;
  const permissions = getRolePermissions(role);

  return {
    role,
    ...permissions,
    isAdmin: role === 'admin',
    isAccountant: role === 'accountant',
    isSales: role === 'sales',
    isViewer: role === 'viewer',
    organizationId: userData?.organizationId || null,
    clientId: userData?.clientId || null,
  };
}

