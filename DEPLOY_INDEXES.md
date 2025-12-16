# 🔧 How to Deploy Firestore Indexes

## Quick Fix - Deploy All Indexes

### Step 1: Login to Firebase
```bash
firebase login
```

### Step 2: Select Your Project
```bash
firebase use zenithbooks-1c818
# Or list projects first:
firebase projects:list
```

### Step 3: Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

### Expected Output:
```
✔  Deploy complete!

Firestore indexes have been deployed successfully.
```

---

## What Gets Deployed

The `firestore.indexes.json` file contains 4 composite indexes:

1. **vaultDocuments**
   - Fields: `userId` (asc) + `uploadedAt` (desc)
   - Used for: Document listing sorted by upload date

2. **vaultShareCodes** (Index 1)
   - Fields: `userId` (asc) + `isActive` (asc)
   - Used for: Filtering active share codes

3. **vaultShareCodes** (Index 2)
   - Fields: `userId` (asc) + `createdAt` (desc)
   - Used for: Share code listing sorted by creation date

4. **vaultAccessLogs**
   - Fields: `userId` (asc) + `accessedAt` (desc)
   - Used for: Access logs sorted by access time

---

## After Deployment

1. **Indexes Start Building** - Takes 1-5 minutes typically
2. **Check Status** - Go to Firebase Console → Firestore → Indexes
3. **Wait for "Enabled"** - Status shows "Building" → "Enabled"
4. **Test Again** - Try accessing the logs page again

---

## Troubleshooting

### Issue: "Project not found"
```bash
# List available projects
firebase projects:list

# Set the correct project
firebase use YOUR_PROJECT_ID
```

### Issue: "Not logged in"
```bash
firebase login
```

### Issue: Index still shows "Building"
- Wait a few more minutes
- Check Firebase Console for any errors
- Indexes build in the background

---

## Verify Indexes in Console

1. Go to: https://console.firebase.google.com/project/zenithbooks-1c818/firestore/indexes
2. Look for indexes with status:
   - ✅ **Enabled** - Ready to use
   - ⏳ **Building** - Still being created (wait)
   - ❌ **Error** - Check error message

---

## Quick Command Reference

```bash
# Login
firebase login

# List projects
firebase projects:list

# Set project
firebase use zenithbooks-1c818

# Deploy indexes only
firebase deploy --only firestore:indexes

# Deploy everything (rules + indexes)
firebase deploy --only firestore

# Check deployment status
firebase deploy:list
```

