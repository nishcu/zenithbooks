# 🔍 Verify Firestore Indexes

## Quick Checklist

### Step 1: Check if Indexes are Deployed

1. **Go to Firebase Console:**
   ```
   https://console.firebase.google.com/project/zenithbooks-1c818/firestore/indexes
   ```

2. **Look for these indexes:**

   **vaultAccessLogs indexes (should have 3):**
   - [ ] `userId` (ASC) + `accessedAt` (DESC)
   - [ ] `shareCodeId` (ASC) + `accessedAt` (DESC)  
   - [ ] `userId` (ASC) + `shareCodeId` (ASC) + `accessedAt` (DESC)

   **Status should be:**
   - ✅ **Enabled** - Ready to use
   - ⏳ **Building** - Wait 1-5 minutes
   - ❌ **Error** - Check error message

---

### Step 2: Verify Index Definition Matches Query

**Query in code:**
```javascript
where("userId", "==", user.uid),
orderBy("accessedAt", "desc"),
limit(1000)
```

**Required Index:**
- Collection: `vaultAccessLogs`
- Field 1: `userId` (ASCENDING)
- Field 2: `accessedAt` (DESCENDING)

**This should match!**

---

### Step 3: If Index Shows "Building"

1. **Wait 1-5 minutes**
2. **Refresh the page**
3. **Check status again**
4. **Try your query again**

---

### Step 4: If Index Shows "Error"

1. **Check error message in Firebase Console**
2. **Common issues:**
   - Collection doesn't exist yet (create a document first)
   - Field types mismatch
   - Invalid field names

---

### Step 5: Force Index Creation (If Needed)

If the index exists but still shows error, try:

1. **Click the error link** in the browser console
2. **This will create the index directly**
3. **Wait for it to build**
4. **Refresh your app**

---

## Troubleshooting Commands

### Check Deployment Status
```bash
firebase deploy:list
```

### Redeploy Indexes
```bash
firebase deploy --only firestore:indexes
```

### Check Firebase Project
```bash
firebase use
# Should show: zenithbooks-1c818
```

---

## Common Issues

### Issue 1: Index Not Deployed
**Solution:** Run `firebase deploy --only firestore:indexes`

### Issue 2: Index Still Building
**Solution:** Wait a few minutes and refresh

### Issue 3: Index Definition Mismatch
**Solution:** Verify the index in console matches the query exactly

### Issue 4: Wrong Project
**Solution:** Verify you're deploying to the correct Firebase project

