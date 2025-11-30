# 🧪 Document Vault - Testing Guide

## Quick Start Testing

### Prerequisites
✅ Build completed successfully
✅ Development server ready
✅ Test user account available

---

## Step 1: Start Development Server

```bash
npm run dev
```

Verify:
- ✅ Server starts on http://localhost:3000
- ✅ No console errors
- ✅ Login page loads

---

## Step 2: Login & Navigate to Vault

1. **Login** with test account
2. **Navigate** to Document Vault:
   - Click "Document Vault" in sidebar, OR
   - Go directly to `/vault`

**Expected:**
- ✅ Vault page loads
- ✅ No errors in console
- ✅ Empty state shown (if no documents)
- ✅ "Upload Document" button visible

---

## Step 3: Quick Smoke Tests (Critical Path)

### Test 3.1: Upload a Document
- [ ] Click "Upload Document"
- [ ] Select a PDF file (< 5MB)
- [ ] Choose category "Income Tax"
- [ ] Add description "Test Document"
- [ ] Click "Upload"
- [ ] ✅ Document appears in list
- [ ] ✅ Storage usage updated

### Test 3.2: Create Share Code
- [ ] Navigate to "Share Codes" (`/vault/sharing`)
- [ ] Click "Create Share Code"
- [ ] Enter name "Test Share"
- [ ] Generate random code
- [ ] Select "Income Tax" category
- [ ] Click "Create"
- [ ] ✅ Code created
- [ ] ✅ Copy the code

### Test 3.3: Access via Share Code
- [ ] Open incognito/private browser
- [ ] Go to `/vault/access`
- [ ] Enter the share code
- [ ] Click "Access Documents"
- [ ] ✅ Document appears
- [ ] ✅ Can download document

### Test 3.4: Check Access Logs
- [ ] Go back to main browser
- [ ] Navigate to "Access Logs" (`/vault/logs`)
- [ ] ✅ Access logged
- [ ] ✅ Shows document name, action, timestamp
- [ ] ✅ IP address shown

---

## Step 4: Comprehensive Testing

Follow the detailed test script in `scripts/test-vault-features.md`:

### Test Suites to Run:
1. ✅ **Document Upload & Storage** (Test Suite 1)
2. ✅ **Document Management** (Test Suite 2)
3. ✅ **Share Code System** (Test Suite 3)
4. ✅ **Third-Party Access** (Test Suite 4)
5. ✅ **Security Features** (Test Suite 5)
6. ✅ **Notifications** (Test Suite 6)
7. ✅ **UI/UX** (Test Suite 7)
8. ✅ **Export & Reporting** (Test Suite 8)
9. ✅ **Dashboard Integration** (Test Suite 9)
10. ✅ **Edge Cases** (Test Suite 10)

---

## Step 5: Browser Console Check

After each test:
- [ ] Open browser DevTools (F12)
- [ ] Check Console tab
- [ ] ✅ No red errors
- [ ] ✅ No warnings (or acceptable warnings)

---

## Step 6: Network Tab Check

During testing:
- [ ] Open Network tab in DevTools
- [ ] Filter by "Fetch/XHR"
- [ ] ✅ API calls succeed (status 200)
- [ ] ✅ No failed requests
- [ ] ✅ Firestore connections working

---

## Step 7: Firebase Console Check

1. Go to Firebase Console
2. Check **Firestore Database**:
   - [ ] Documents in `vaultDocuments` collection
   - [ ] Share codes in `vaultShareCodes` collection
   - [ ] Access logs in `vaultAccessLogs` collection
   - [ ] Share codes are **hashed** (not plain text)

3. Check **Storage**:
   - [ ] Files uploaded to `vault/` folder
   - [ ] File paths correct
   - [ ] Files accessible

---

## Common Issues & Quick Fixes

### Issue: "Upload failed"
- **Check:** File size < 50MB
- **Check:** File type allowed (PDF, JPG, PNG, DOC, DOCX, XLS, XLSX)
- **Check:** Browser console for errors

### Issue: "Share code not working"
- **Check:** Code hasn't expired (5 days)
- **Check:** Code is active in Firestore
- **Check:** Categories are selected in share code

### Issue: "No documents showing"
- **Check:** User is logged in
- **Check:** Filter/search not hiding documents
- **Check:** Correct category selected

### Issue: "Access logs not showing"
- **Check:** User ID matches
- **Check:** Document was actually accessed
- **Check:** Firestore query working

---

## Testing Checklist

### Critical Features (Must Work)
- [ ] Document upload works
- [ ] Documents visible in list
- [ ] Share code creation works
- [ ] Share code access works (third party)
- [ ] Access logs record correctly
- [ ] Storage limits enforced
- [ ] Rate limiting works (after 5 failed attempts)

### Important Features (Should Work)
- [ ] Document editing works
- [ ] Document deletion works
- [ ] Version history works
- [ ] Search works
- [ ] Category filtering works
- [ ] Export logs works
- [ ] Notifications appear
- [ ] Settings page works

### Nice-to-Have Features
- [ ] Mobile responsive
- [ ] Loading states show
- [ ] Error messages are friendly
- [ ] Tooltips appear
- [ ] Dashboard widget shows

---

## Test Data Recommendations

### Create Test Documents:
1. **Small PDF** (< 1MB) - Quick upload test
2. **Medium PDF** (~10MB) - Normal upload test
3. **Image** (JPG) - Different file type
4. **Office Doc** (DOCX) - Word document test

### Create Test Share Codes:
1. **Single category** - Test basic sharing
2. **Multiple categories** - Test selective sharing
3. **All categories** - Test full access

### Test Different Scenarios:
1. **New user** - First upload
2. **Existing user** - With documents
3. **Near storage limit** - Test warnings
4. **Expired code** - Test expiry handling

---

## Reporting Issues

When reporting issues, include:
- **What you did** (steps to reproduce)
- **What you expected** (expected behavior)
- **What happened** (actual behavior)
- **Screenshots** (if applicable)
- **Console errors** (copy from DevTools)
- **Browser & version** (Chrome, Firefox, etc.)

---

## Next Steps After Testing

Once testing is complete:
1. ✅ Document all issues found
2. ✅ Prioritize fixes (Critical → Important → Nice-to-have)
3. ✅ Fix issues
4. ✅ Re-test fixed issues
5. ✅ Update test documentation with findings

---

**Ready to start?** Follow Step 1 above! 🚀

