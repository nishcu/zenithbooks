# User Invite System - Complete Explanation

## 📋 Overview

The User Invite System allows professionals and business users to invite staff members to help manage their organization. For professionals, you can also invite users for specific clients.

---

## 🎯 How It Works

### 1. **Inviting Users**

#### For Business Users:
- Go to **Settings → User Management**
- Click **"Invite User"**
- Enter the user's email address
- Select a role (Admin, Accountant, Sales, or Viewer)
- Click **"Send Invitation"**

#### For Professionals:
- Go to **Settings → User Management**
- Click **"Invite User"**
- Enter the user's email address
- **NEW:** Select **"Invite For"**:
  - **Organization-wide (All Clients)**: User can access all clients and your organization data
  - **[Client Name] (Client-specific)**: User can only access that specific client's data
- Select a role (Admin, Accountant, Sales, or Viewer)
- Click **"Send Invitation"**

### 2. **What Happens When You Invite**

1. An invitation record is created in the `userInvites` collection with:
   - Email address
   - Role (admin, accountant, sales, viewer)
   - Status: "Invited"
   - Invited by: Your user ID
   - **Client ID** (if client-specific invite)
   - **Invite Type**: "organization-wide" or "client-specific"

2. The invited user receives a notification (currently stored in database, email integration can be added later)

3. The invitation appears in your **"Invited & Active Users"** table

### 3. **How Invited Users Sign Up**

1. The invited user goes to the signup page
2. They sign up using the **exact email address** they were invited with
3. During signup, the system checks if their email matches any pending invitations
4. If a match is found:
   - The user is automatically linked to your organization
   - Their role is set based on the invitation
   - Their access scope is set (all clients or specific client)
   - The invitation status changes to "Active"

### 4. **What Invited Users Can Do**

Invited users are like **staff members** who help you manage your organization:

#### **Admin (Full Access)**
- Can access all features
- Can manage other users
- Can view/edit all data
- Can invite more users

#### **Accountant (Billing & Accounting)**
- Can access billing and accounting features
- Can create invoices, manage accounts
- Can view financial reports
- Cannot manage users or settings

#### **Sales (Billing only)**
- Can create and manage invoices
- Can view sales reports
- Cannot access accounting features
- Cannot manage users

#### **Viewer (Read-only)**
- Can view all data but cannot edit
- Cannot create invoices or make changes
- Useful for auditors or consultants who need to review data

---

## 🏢 For Professionals: Client-Specific vs Organization-Wide

### **Organization-Wide Invites**
- User can access **all clients** you manage
- User can access **your organization's data**
- Best for: Senior staff, managers, or accountants who work with multiple clients

### **Client-Specific Invites**
- User can **only access one specific client's data**
- User **cannot see** other clients or your organization data
- Best for: Staff assigned to work with a specific client, or when you want to limit access

**Example:**
- You manage 5 clients: ABC Corp, XYZ Ltd, DEF Inc, GHI LLC, JKL Co
- You invite John as an Accountant for "ABC Corp" only
- John can only see and work with ABC Corp's invoices, accounts, and reports
- John cannot see data for XYZ Ltd, DEF Inc, or any other client

---

## 🔐 Login & Access

### **How Invited Users Login:**
1. They go to the login page
2. They use the **email address** they were invited with
3. They use their own password (set during signup)
4. Once logged in, they see:
   - **Organization-wide users**: All clients and organization data (if professional) or all organization data (if business)
   - **Client-specific users**: Only the client they were assigned to

### **What They See:**
- **Dashboard**: Shows data based on their access scope
- **Menu Items**: Based on their role (Admin sees everything, Viewer sees read-only versions)
- **Client Switching**: Only organization-wide users can switch between clients (if professional)

---

## 📊 User Management Table

The **"Invited & Active Users"** table shows:
- **User Email**: The email address of the invited user
- **Role**: Their assigned role (Admin, Accountant, Sales, Viewer)
- **Scope** (for professionals): Shows which client they're assigned to, or "All Clients" for organization-wide
- **Status**: 
  - **"Invited"**: User hasn't signed up yet
  - **"Active"**: User has signed up and is using the system

---

## 🎯 Use Cases

### **Use Case 1: Professional CA Firm**
- You're a CA managing 10 client businesses
- You invite your assistant as **"Accountant - Organization-wide"**
  - They can help with all 10 clients
- You invite a junior accountant as **"Accountant - ABC Corp only"**
  - They only work with ABC Corp, can't see other clients

### **Use Case 2: Business Owner**
- You own a business and want your accountant to help
- You invite them as **"Accountant - Organization-wide"**
  - They can manage all your invoices, accounts, and reports
  - They cannot change settings or invite other users (unless Admin role)

### **Use Case 3: Multi-Level Access**
- You're a professional with 5 clients
- You invite:
  - **Senior Accountant** (Admin, Organization-wide): Can manage everything
  - **Junior Accountant 1** (Accountant, Client A only): Works only with Client A
  - **Junior Accountant 2** (Accountant, Client B only): Works only with Client B
  - **Auditor** (Viewer, Organization-wide): Can review all clients but cannot edit

---

## ⚠️ Important Notes

1. **Email Must Match Exactly**: The invited user must sign up with the exact email address used in the invitation

2. **One Invitation Per Email**: Each email can only have one active invitation at a time

3. **Role Permissions**: Roles determine what features users can access, not just what they can see

4. **Client-Specific Access**: Client-specific users cannot switch clients or see other clients' data

5. **Organization Data**: Even client-specific users can see your organization's general settings (but not other clients)

6. **Invitation Expiry**: Currently invitations don't expire, but this can be added in the future

---

## 🔧 Technical Details

### **Database Structure:**

**Collection: `userInvites`**
```javascript
{
  email: "user@example.com",
  role: "accountant",
  status: "Invited" | "Active",
  invitedBy: "professional-user-id",
  invitedAt: Timestamp,
  clientId: "client-id" (optional, for client-specific),
  inviteType: "organization-wide" | "client-specific"
}
```

### **User Document:**
When a user signs up and accepts an invitation, their user document includes:
```javascript
{
  uid: "user-id",
  email: "user@example.com",
  userType: "business" | "professional",
  invitedBy: "professional-user-id",
  role: "admin" | "accountant" | "sales" | "viewer",
  clientId: "client-id" (if client-specific),
  organizationId: "professional-user-id"
}
```

---

## 🚀 Future Enhancements (Potential)

1. **Email Notifications**: Send actual email invitations
2. **Invitation Links**: Generate unique links for invitations
3. **Invitation Expiry**: Set expiration dates for invitations
4. **Bulk Invites**: Invite multiple users at once
5. **Role Customization**: Create custom roles with specific permissions
6. **Access Logs**: Track what invited users access and when

---

## ❓ FAQ

**Q: Can I invite the same user for multiple clients?**
A: Currently, each email can only have one active invitation. You could invite them organization-wide to give access to all clients.

**Q: What if the invited user already has an account?**
A: They would need to use a different email, or the system would need to handle account merging (future feature).

**Q: Can I change a user's role after inviting them?**
A: Yes, you can edit their role from the User Management table (Edit Role option).

**Q: Can client-specific users see my organization's invoices?**
A: No, they can only see data for the specific client they were assigned to.

**Q: How do I remove an invited user?**
A: Use the "Remove User" option from the actions menu in the User Management table.

---

## 📝 Summary

- **Invite System**: Allows you to invite staff members to help manage your organization
- **For Professionals**: Can invite users for specific clients or organization-wide
- **Roles**: Admin, Accountant, Sales, Viewer (different permission levels)
- **Login**: Invited users sign up with the invited email and get automatic access
- **Access Control**: Client-specific users only see their assigned client; organization-wide users see everything

