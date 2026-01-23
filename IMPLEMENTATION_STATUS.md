# Organization Access & Role Permissions - Implementation Status

## ✅ Completed (Phase 1)

### Core Infrastructure
- ✅ Created `src/lib/organization-utils.ts` with utility functions:
  - `getUserOrganizationData()` - Gets user's organization data
  - `buildOrganizationQuery()` - Builds queries with organization support
  - `getDocumentData()` - Gets data to include when creating documents
  - `getRolePermissions()` - Gets permissions for a role

- ✅ Created `src/hooks/use-role-permissions.ts` hook for UI checks

- ✅ Updated Firestore rules to support organization access and role-based permissions

### Updated Components
- ✅ **Parties Page** (`src/app/(app)/parties/page.tsx`):
  - Uses organization queries for customers and vendors
  - Includes organizationId when importing parties
  - Role-based delete permission checks

- ✅ **PartyDialog** (`src/components/billing/add-new-dialogs.tsx`):
  - Includes organizationId when creating new parties
  - Includes organizationId when creating user accounts

- ✅ **Dashboard** (`src/app/(app)/dashboard/dashboard-content.tsx`):
  - Uses organization queries for customers and vendors

## ⏳ Remaining Work

### High Priority
1. **Invoice Creation & Queries**
   - Update invoice creation to include organizationId
   - Update invoice queries to use organizationId
   - Files: `src/app/(app)/billing/invoices/**/*.tsx`

2. **Journal Voucher Creation & Queries**
   - Update journal voucher creation to include organizationId
   - Update journal voucher queries to use organizationId
   - Files: `src/app/(app)/accounting/journal/**/*.tsx`

3. **Stock Items Creation & Queries**
   - Update stock item creation to include organizationId
   - Update stock item queries to use organizationId
   - Files: `src/app/(app)/items/**/*.tsx`

4. **Sales Orders Creation & Queries**
   - Update sales order creation to include organizationId
   - Update sales order queries to use organizationId
   - Files: `src/app/(app)/billing/sales-orders/**/*.tsx`

5. **Purchase Orders Creation & Queries**
   - Update purchase order creation to include organizationId
   - Update purchase order queries to use organizationId
   - Files: `src/app/(app)/purchases/**/*.tsx`

### Medium Priority
6. **UI Role Checks**
   - Add role checks to hide/disable features:
     - Hide delete buttons for non-admins
     - Hide settings menu for non-admins
     - Hide accounting features for sales role
     - Show read-only indicators for viewer role
   - Files: All pages with create/update/delete actions

7. **Client-Specific Filtering**
   - Add clientId filtering to all queries
   - Update UI to show client context
   - Files: All query files

## 📋 Implementation Pattern

### For Data Creation:
```typescript
import { getUserOrganizationData, getDocumentData } from "@/lib/organization-utils";

// In component:
const orgData = await getUserOrganizationData(user);
const docData = getDocumentData(user, orgData);

// When creating document:
await addDoc(collection(db, 'collectionName'), {
  ...otherFields,
  ...docData, // Includes userId, organizationId, clientId
});
```

### For Queries:
```typescript
import { getUserOrganizationData, buildOrganizationQuery } from "@/lib/organization-utils";
import { useEffect, useState } from "react";

// In component:
const [orgData, setOrgData] = useState(null);
useEffect(() => {
  const loadOrgData = async () => {
    if (user) {
      const data = await getUserOrganizationData(user);
      setOrgData(data);
    }
  };
  loadOrgData();
}, [user]);

// Build query:
const query = useMemo(() => {
  if (!user || orgData === null) return null;
  return buildOrganizationQuery('collectionName', user, orgData) || 
         query(collection(db, 'collectionName'), where("userId", "==", user.uid));
}, [user, orgData]);
```

### For UI Role Checks:
```typescript
import { useRolePermissions } from "@/hooks/use-role-permissions";

// In component:
const { canDelete, canCreate, canUpdate, canAccessAccounting } = useRolePermissions();

// In JSX:
{canDelete && (
  <Button onClick={handleDelete}>Delete</Button>
)}
```

## 🎯 Next Steps

1. Continue updating remaining data creation functions
2. Continue updating remaining queries
3. Add UI role checks throughout the application
4. Test with invited users to verify access works correctly

