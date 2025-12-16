# 🔒 Deploying Firestore & Storage Rules

## ✅ Rules Already Updated Locally

The following rule files have been updated in your codebase:

1. **`firestore.rules`** - Added Document Vault collections:
   - `vaultDocuments`
   - `vaultShareCodes`
   - `vaultAccessLogs`
   - `vaultNotifications`
   - `vaultSettings`

2. **`storage.rules`** - Added Document Vault storage rules for `/vault/{userId}/` path

## 🚀 Deploy Rules to Firebase

You have **2 options** to deploy these rules:

### **Option 1: Using Firebase CLI (Recommended)**

If you have Firebase CLI installed:

```bash
# Deploy Firestore rules only
firebase deploy --only firestore:rules

# Deploy Storage rules only
firebase deploy --only storage

# Or deploy both at once
firebase deploy --only firestore:rules,storage
```

### **Option 2: Using Firebase Console (Manual)**

1. **Firestore Rules:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Navigate to **Firestore Database** → **Rules** tab
   - Copy contents from `firestore.rules` file
   - Paste into the console editor
   - Click **Publish**

2. **Storage Rules:**
   - In Firebase Console
   - Navigate to **Storage** → **Rules** tab
   - Copy contents from `storage.rules` file
   - Paste into the console editor
   - Click **Publish**

## ⚠️ Important Notes

1. **Deploy Rules BEFORE Testing:**
   - The vault feature won't work properly until rules are deployed
   - Users will get permission denied errors without proper rules

2. **Test Rules:**
   - After deploying, test document upload/download
   - Verify users can only access their own documents
   - Test share code access (will be implemented in Phase 3)

3. **Current Rule Status:**
   - Rules are configured for owner-only access
   - Share code public access will be handled via API routes (Phase 4)
   - All vault collections follow the `isOwner()` pattern

## 📋 Quick Deploy Command

```bash
# Make sure you're in the project root directory
cd /home/surya/Downloads/zenithbooks-main\ \(2\)

# Deploy both Firestore and Storage rules
firebase deploy --only firestore:rules,storage
```

## ✅ Verification

After deploying, you can verify rules are active by:
1. Checking Firebase Console → Rules tab (should show your new rules)
2. Testing document upload in the app
3. Checking browser console for any permission errors

---

**Status:** ✅ Rules files updated locally  
**Action Required:** Deploy to Firebase using one of the methods above

