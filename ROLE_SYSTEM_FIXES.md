# Role System Fixes - Implementation Guide

## ✅ What Was Fixed

### 1. Firestore Rules Updated

**Added Helper Functions:**
- `getUserData()` - Gets current user's document data
- `isOrganizationMember(organizationId)` - Checks if user belongs to organization
- `canAccessData(userId, organizationId)` - Checks if user can access data (owner or org member)
- `hasRolePermission(permission)` - Checks role-based permissions
- `canAccessClientData(clientId)` - Checks client-specific access

**Updated Collections:**
- `journalVouchers` - Now supports organization access with role checks
- `customers` - Organization members can access based on role
- `vendors` - Organization members can access based on role
- `stockItems` - Organization members can access based on role
- `settings` - Only admins can modify organization settings
- `sales-orders` - Organization members can access based on role

**Role Permissions:**
- **Admin**: Full access (read, create, update, delete, settings, accounting, billing)
- **Accountant**: Read, create, update (no delete, no settings, has accounting access)
- **Sales**: Read, create, update (no delete, no settings, no accounting, billing only)
- **Viewer**: Read-only (no create, update, delete, can view accounting and billing)

## ⚠️ Still Needed

### 1. Update Data Creation to Include `organizationId`

**Problem:** When organization members create documents, they need to include `organizationId` field.

**Solution:** Update all data creation functions to:
```typescript
// When creating a document, check if user has organizationId
const userData = await getUserData(user.uid);
const documentData = {
  userId: user.uid,
  organizationId: userData?.organizationId || null, // Add organizationId
  // ... other fields
};
```

**Files to Update:**
- Customer creation
- Vendor creation
- Invoice creation
- Journal voucher creation
- Stock item creation
- Sales order creation

### 2. Update Data Queries to Filter by `organizationId`

**Problem:** Queries currently filter by `userId` only. Need to also query by `organizationId`.

**Solution:** Update queries to:
```typescript
// If user has organizationId, query by organizationId
// Otherwise, query by userId (backward compatibility)
const userData = await getUserData(user.uid);
const query = userData?.organizationId
  ? query(collection(db, 'customers'), where('organizationId', '==', userData.organizationId))
  : query(collection(db, 'customers'), where('userId', '==', user.uid));
```

**Files to Update:**
- Dashboard queries
- Customer list queries
- Vendor list queries
- Invoice list queries
- All data listing pages

### 3. Add UI Role Checks

**Problem:** UI doesn't hide/disable features based on role.

**Solution:** Create role check hooks/components:
```typescript
// hooks/use-role-permissions.ts
export function useRolePermissions() {
  const [user] = useAuthState(auth);
  const userDocRef = user ? doc(db, 'users', user.uid) : null;
  const [userData] = useDocumentData(userDocRef);
  
  const role = userData?.role || null;
  
  return {
    canCreate: role === 'admin' || role === 'accountant' || role === 'sales',
    canUpdate: role === 'admin' || role === 'accountant' || role === 'sales',
    canDelete: role === 'admin',
    canAccessAccounting: role === 'admin' || role === 'accountant' || role === 'viewer',
    canAccessBilling: true, // All roles can access billing
    canAccessSettings: role === 'admin',
    isViewer: role === 'viewer',
  };
}
```

**Files to Update:**
- All pages with create/update/delete buttons
- Settings pages
- Accounting pages (hide for sales role)
- Navigation menu (hide settings for non-admins)

### 4. Client-Specific Filtering

**Problem:** Users with `clientId` should only see that client's data.

**Solution:** Add client filtering to queries:
```typescript
const userData = await getUserData(user.uid);
if (userData?.clientId) {
  // Filter by clientId
  query = query(collection(db, 'customers'), 
    where('organizationId', '==', userData.organizationId),
    where('clientId', '==', userData.clientId));
} else if (userData?.organizationId) {
  // Filter by organizationId
  query = query(collection(db, 'customers'), 
    where('organizationId', '==', userData.organizationId));
} else {
  // Filter by userId (backward compatibility)
  query = query(collection(db, 'customers'), 
    where('userId', '==', user.uid));
}
```

## 📋 Implementation Checklist

### Phase 1: Data Structure (HIGH PRIORITY)
- [ ] Update customer creation to include `organizationId`
- [ ] Update vendor creation to include `organizationId`
- [ ] Update invoice creation to include `organizationId`
- [ ] Update journal voucher creation to include `organizationId`
- [ ] Update stock item creation to include `organizationId`
- [ ] Update sales order creation to include `organizationId`

### Phase 2: Data Queries (HIGH PRIORITY)
- [ ] Update dashboard queries to use `organizationId`
- [ ] Update customer list queries
- [ ] Update vendor list queries
- [ ] Update invoice list queries
- [ ] Update all data listing pages

### Phase 3: UI Role Checks (MEDIUM PRIORITY)
- [ ] Create `useRolePermissions` hook
- [ ] Hide delete buttons for non-admins
- [ ] Hide settings menu for non-admins
- [ ] Hide accounting features for sales role
- [ ] Add read-only indicators for viewer role

### Phase 4: Client Filtering (MEDIUM PRIORITY)
- [ ] Add client filtering to all queries
- [ ] Test client-specific access
- [ ] Update UI to show client context

## 🎯 How It Works Now

### Current Flow:
1. **Professional invites user** → Creates `userInvites` document
2. **User accepts invitation** → User document updated with `role`, `organizationId`, `clientId`
3. **User tries to access data** → Firestore rules check:
   - Is user the owner? (backward compatibility)
   - OR is user part of organization? (new)
   - AND does user have required role permission?

### What Works:
- ✅ Firestore rules allow organization access
- ✅ Role permissions are enforced in rules
- ✅ Invitation system works end-to-end

### What Doesn't Work Yet:
- ❌ Data creation doesn't include `organizationId` (so new documents aren't shared)
- ❌ Queries don't filter by `organizationId` (so users don't see org data)
- ❌ UI doesn't check roles (so all features visible to all users)

## 🚀 Next Steps

1. **Immediate:** Update data creation to include `organizationId`
2. **Immediate:** Update queries to filter by `organizationId`
3. **Soon:** Add UI role checks
4. **Later:** Add client-specific filtering

