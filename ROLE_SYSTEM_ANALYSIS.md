# Role Assignment & Access Control System - Analysis & Missing Pieces

## 🔍 Current Implementation Status

### ✅ What's Working

1. **Invitation Creation** (`/settings/users`)
   - ✅ Can invite users by email
   - ✅ Can assign roles: `admin`, `accountant`, `sales`, `viewer`
   - ✅ Can set organization-wide or client-specific access
   - ✅ Stores invitation in `userInvites` collection

2. **Invitation Acceptance**
   - ✅ Auto-accepts during signup (if email matches)
   - ✅ Manual acceptance page (`/settings/invitations`)
   - ✅ Updates user document with `role`, `organizationId`, `clientId`

3. **Firestore Rules for Invitations**
   - ✅ Users can create/read/update invites they created

### ❌ What's Missing

## 🚨 Critical Missing Features

### 1. **Firestore Rules Don't Support Organization Access**

**Problem:** Currently, Firestore rules only allow users to access their own data (`userId == request.auth.uid`). When a user accepts an invitation and gets `organizationId`, they **cannot access the organization's data** because rules don't check for organization membership.

**Impact:** Invited users can't see invoices, customers, vendors, or any organization data even after accepting invitation.

**Example:**
```javascript
// Current rule (WRONG):
match /customers/{docId} {
  allow read: if isOwner(resource.data.userId); // Only owner can access
}

// Needed rule:
match /customers/{docId} {
  allow read: if isOwner(resource.data.userId) || 
                 isOrganizationMember(resource.data.userId);
}
```

### 2. **Role Permissions Not Enforced**

**Problem:** Roles (`admin`, `accountant`, `sales`, `viewer`) are stored but not used to control what users can do.

**Missing Permissions:**
- **Admin**: Full access (create, read, update, delete)
- **Accountant**: Read + Write (billing & accounting)
- **Sales**: Read + Write (billing only, no accounting)
- **Viewer**: Read-only (no create, update, delete)

**Impact:** All invited users have same access level regardless of role.

### 3. **Client-Specific Access Not Implemented**

**Problem:** When `clientId` is set, user should only see that client's data, but rules don't filter by `clientId`.

**Impact:** Client-specific users can see all organization data instead of just their client's data.

### 4. **UI Doesn't Check Roles**

**Problem:** UI doesn't hide/disable features based on role permissions.

**Missing:**
- Hide "Delete" buttons for non-admin users
- Hide "Settings" menu for non-admin users
- Disable accounting features for "sales" role
- Show read-only indicators for "viewer" role

### 5. **No Role-Based Data Filtering**

**Problem:** Queries don't filter data based on `organizationId` or `clientId`.

**Impact:** Users see their own data instead of organization data after accepting invitation.

## 📋 Required Fixes

### Fix 1: Update Firestore Rules

Add helper functions and update rules to support:
- Organization membership checks
- Role-based permissions
- Client-specific filtering

### Fix 2: Create Role Permission System

Define what each role can do:
```typescript
const ROLE_PERMISSIONS = {
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
    canDelete: false, // Can't delete
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
    canAccessAccounting: false, // No accounting
    canAccessBilling: true,
  },
  viewer: {
    canRead: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canManageUsers: false,
    canAccessSettings: false,
    canAccessAccounting: true, // Can view but not edit
    canAccessBilling: true,
  },
};
```

### Fix 3: Update Data Queries

Modify queries to use `organizationId` instead of `userId` when user is part of organization.

### Fix 4: Add UI Role Checks

Add role-based UI components that show/hide features based on permissions.

## 🎯 How It Should Work

### Flow 1: Invitation & Acceptance

1. **Professional invites user** (`/settings/users`)
   - Selects email, role, and optionally client
   - Creates `userInvites` document

2. **User signs up or accepts invitation**
   - If new signup: Auto-accepts if email matches
   - If existing user: Goes to `/settings/invitations` to accept
   - User document updated with:
     - `role`: "admin" | "accountant" | "sales" | "viewer"
     - `organizationId`: Inviter's UID
     - `clientId`: Optional client ID (if client-specific)

3. **User accesses organization data**
   - Queries filter by `organizationId` instead of `userId`
   - Firestore rules allow access based on organization membership
   - Role permissions control what actions are allowed

### Flow 2: Data Access After Acceptance

**Before Fix:**
- User accepts invitation
- User still sees only their own data (empty dashboard)
- Cannot access organization data

**After Fix:**
- User accepts invitation
- User sees organization's data (invoices, customers, etc.)
- Access controlled by role (admin sees all, viewer sees read-only)
- If client-specific, only sees that client's data

## 🔧 Implementation Priority

1. **HIGH**: Update Firestore rules for organization access
2. **HIGH**: Update data queries to use `organizationId`
3. **MEDIUM**: Add role permission checks in UI
4. **MEDIUM**: Implement client-specific filtering
5. **LOW**: Add role-based UI indicators

