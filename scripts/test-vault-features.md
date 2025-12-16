# 🧪 Document Vault - Testing Script

Use this script to systematically test all Document Vault features before and after deployment.

## Pre-Deployment Testing

### Setup
1. Start development server: `npm run dev`
2. Login as test user
3. Navigate to Document Vault

---

## Test Suite 1: Document Upload & Storage

### Test 1.1: Basic Upload
- [ ] Upload a PDF file (< 5MB)
- [ ] Select category "Income Tax"
- [ ] Add description "Test PDF"
- [ ] Verify document appears in list
- [ ] Verify correct category assigned
- [ ] Verify storage usage updated

### Test 1.2: File Type Validation
- [ ] Try uploading .txt file → Should fail
- [ ] Try uploading .zip file → Should fail
- [ ] Upload .pdf → Should succeed
- [ ] Upload .jpg → Should succeed
- [ ] Upload .docx → Should succeed

### Test 1.3: File Size Validation
- [ ] Upload 49MB file → Should succeed
- [ ] Try uploading 51MB file → Should fail with error
- [ ] Verify error message is user-friendly

### Test 1.4: Storage Limit
- [ ] Upload documents totaling 4.9GB → Should succeed
- [ ] Try uploading 200MB more → Should fail (exceeds 5GB)
- [ ] Verify storage warning appears at 80%, 90%, 95%

### Test 1.5: All Categories
- [ ] Upload document to each of 14 categories
- [ ] Verify all categories work
- [ ] Verify "Others" category works for miscellaneous

---

## Test Suite 2: Document Management

### Test 2.1: View Documents
- [ ] View document list
- [ ] Filter by category
- [ ] Search by document name
- [ ] Verify search works correctly

### Test 2.2: Edit Metadata
- [ ] Edit document name
- [ ] Change category
- [ ] Update description
- [ ] Verify changes saved
- [ ] Verify version number unchanged

### Test 2.3: Version Management
- [ ] Upload initial document (v1)
- [ ] Upload new version (v2)
- [ ] Add version note
- [ ] Verify version history shows both versions
- [ ] Download v1 and v2
- [ ] Verify files are different

### Test 2.4: Delete Document
- [ ] Delete a document
- [ ] Verify confirmation dialog
- [ ] Verify document removed from list
- [ ] Verify storage usage decreased
- [ ] Verify all versions deleted

---

## Test Suite 3: Share Code System

### Test 3.1: Create Share Code
- [ ] Navigate to Share Codes
- [ ] Create new share code
- [ ] Enter code name "Test Code 1"
- [ ] Generate random code
- [ ] Select 3 categories to share
- [ ] Add description
- [ ] Verify code created
- [ ] Verify code is hashed (check Firestore)
- [ ] Copy share code

### Test 3.2: Multiple Share Codes
- [ ] Create second share code
- [ ] Select different categories
- [ ] Verify both codes exist
- [ ] Verify independent category selection

### Test 3.3: Share Code Expiry
- [ ] Create share code
- [ ] Verify expiry date is 5 days from now
- [ ] Note the exact expiry time
- [ ] Verify countdown display

### Test 3.4: Edit Share Code
- [ ] Edit existing share code
- [ ] Add/remove categories
- [ ] Update description
- [ ] Verify changes saved
- [ ] Verify expiry unchanged

### Test 3.5: Delete Share Code
- [ ] Delete a share code
- [ ] Verify confirmation
- [ ] Verify code removed
- [ ] Try using deleted code → Should fail

---

## Test Suite 4: Third-Party Access

### Test 4.1: Valid Access
- [ ] Open incognito/private browser
- [ ] Navigate to `/vault/access`
- [ ] Enter valid share code
- [ ] Verify shared documents appear
- [ ] Verify only shared categories visible
- [ ] Verify non-shared categories hidden

### Test 4.2: Download Documents
- [ ] Click download on a document
- [ ] Verify file downloads
- [ ] Verify file is correct
- [ ] Verify access log created

### Test 4.3: Invalid Code
- [ ] Enter random code
- [ ] Verify error message
- [ ] Verify user-friendly message (not technical)

### Test 4.4: Expired Code
- [ ] Create share code
- [ ] Manually set expiry to past (in Firestore)
- [ ] Try accessing → Should fail
- [ ] Verify error message about expiry

### Test 4.5: Category Filtering
- [ ] Share code with only "Income Tax" and "GST"
- [ ] Access via code
- [ ] Verify only these 2 categories visible
- [ ] Verify other categories hidden

---

## Test Suite 5: Security Features

### Test 5.1: Rate Limiting
- [ ] Open `/vault/access` in new browser
- [ ] Enter wrong code 1st time → Should fail
- [ ] Enter wrong code 2nd time → Should fail
- [ ] Enter wrong code 3rd time → Should fail
- [ ] Enter wrong code 4th time → Should fail
- [ ] Enter wrong code 5th time → Should fail
- [ ] Enter wrong code 6th time → Should show lockout message
- [ ] Verify 15-minute lockout message
- [ ] Wait 15 minutes or reset in Firestore
- [ ] Try again → Should work

### Test 5.2: Suspicious Activity Detection
- [ ] Create share code
- [ ] Access from IP 1
- [ ] Access from IP 2 (different device/network)
- [ ] Access from IP 3
- [ ] Access from IP 4
- [ ] Access from IP 5
- [ ] Access from IP 6
- [ ] Verify suspicious activity flag in logs
- [ ] Verify notification sent to owner

### Test 5.3: Access Logging
- [ ] Access document via share code
- [ ] Download document via share code
- [ ] Check Access Logs page
- [ ] Verify both actions logged
- [ ] Verify IP address logged
- [ ] Verify timestamp correct
- [ ] Verify share code name shown

### Test 5.4: User Isolation
- [ ] Login as User A
- [ ] Upload documents
- [ ] Create share code
- [ ] Logout
- [ ] Login as User B
- [ ] Verify User B cannot see User A's documents
- [ ] Verify User B cannot access User A's share codes
- [ ] Verify User B can only see own documents

---

## Test Suite 6: Notifications

### Test 6.1: Access Notifications
- [ ] Enable "Access Alerts" in settings
- [ ] Access document via share code (third party)
- [ ] Verify notification created
- [ ] Check notification center
- [ ] Verify notification appears
- [ ] Click notification → Should navigate to logs

### Test 6.2: Expiry Notifications
- [ ] Enable "Expiry Warnings" in settings
- [ ] Create share code
- [ ] Manually set expiry to 23 hours from now
- [ ] Wait for notification (or trigger manually)
- [ ] Verify expiry warning notification
- [ ] Verify expired notification when code expires

### Test 6.3: Storage Notifications
- [ ] Enable "Storage Warnings" in settings
- [ ] Upload documents to reach 80% storage
- [ ] Verify warning notification
- [ ] Upload more to reach 90%
- [ ] Verify critical warning
- [ ] Upload more to reach 95%
- [ ] Verify urgent warning

### Test 6.4: Notification Preferences
- [ ] Disable "Access Alerts"
- [ ] Access document → No notification
- [ ] Enable "Access Alerts"
- [ ] Access document → Notification created
- [ ] Verify preferences persist after page reload

---

## Test Suite 7: UI/UX

### Test 7.1: Mobile Responsiveness
- [ ] Test on mobile device or browser dev tools
- [ ] Verify upload dialog works
- [ ] Verify document list scrolls
- [ ] Verify share code creation works
- [ ] Verify access page works
- [ ] Verify settings page works

### Test 7.2: Loading States
- [ ] Upload large file
- [ ] Verify upload progress shown
- [ ] Verify loading skeleton on document list
- [ ] Verify loading states on all pages

### Test 7.3: Error Handling
- [ ] Disconnect internet
- [ ] Try uploading → Error message shown
- [ ] Try accessing share code → Error message shown
- [ ] Verify error messages are user-friendly
- [ ] Verify no technical jargon

### Test 7.4: Empty States
- [ ] New user (no documents)
- [ ] Verify onboarding hint shown
- [ ] Verify empty state message
- [ ] Verify "Upload Document" button visible

### Test 7.5: Tooltips & Help
- [ ] Hover over help icons
- [ ] Verify tooltips appear
- [ ] Verify tooltips are helpful
- [ ] Verify tooltips on mobile (tap)

---

## Test Suite 8: Export & Reporting

### Test 8.1: Export Access Logs
- [ ] Generate some access logs (access documents)
- [ ] Go to Access Logs page
- [ ] Apply filters (if needed)
- [ ] Click "Export to CSV"
- [ ] Verify CSV file downloads
- [ ] Open CSV file
- [ ] Verify all columns present
- [ ] Verify data is correct
- [ ] Verify suspicious activity flag exported

### Test 8.2: Statistics
- [ ] View access logs page
- [ ] Verify statistics display:
  - Total accesses
  - Downloads vs Views
  - Unique documents
  - Unique share codes
  - Category breakdown

---

## Test Suite 9: Dashboard Integration

### Test 9.1: Vault Statistics Widget
- [ ] Go to Dashboard
- [ ] Verify Vault Statistics widget visible
- [ ] Verify document count correct
- [ ] Verify storage usage correct
- [ ] Verify recent documents shown
- [ ] Click "View All" → Navigate to vault
- [ ] Click "Upload" → Opens upload dialog

---

## Test Suite 10: Edge Cases

### Test 10.1: Same File Name
- [ ] Upload "document.pdf" to "Income Tax"
- [ ] Upload "document.pdf" to "GST"
- [ ] Verify both saved separately
- [ ] Verify no conflicts

### Test 10.2: Special Characters
- [ ] Upload file with special characters in name
- [ ] Create share code with special characters
- [ ] Verify everything works
- [ ] Verify no encoding issues

### Test 10.3: Long Names
- [ ] Upload file with very long name (100+ chars)
- [ ] Create share code with long name
- [ ] Verify UI handles correctly
- [ ] Verify no overflow

### Test 10.4: Concurrent Access
- [ ] User A uploads document
- [ ] User B accesses via share code (same time)
- [ ] Verify no conflicts
- [ ] Verify both operations succeed

### Test 10.5: Large Document Lists
- [ ] Upload 100+ documents
- [ ] Verify list loads
- [ ] Verify pagination works (if implemented)
- [ ] Verify search works
- [ ] Verify filtering works

---

## Post-Deployment Testing

Repeat all tests in production environment:

- [ ] Test Suite 1: Document Upload & Storage
- [ ] Test Suite 2: Document Management
- [ ] Test Suite 3: Share Code System
- [ ] Test Suite 4: Third-Party Access
- [ ] Test Suite 5: Security Features
- [ ] Test Suite 6: Notifications
- [ ] Test Suite 7: UI/UX
- [ ] Test Suite 8: Export & Reporting
- [ ] Test Suite 9: Dashboard Integration
- [ ] Test Suite 10: Edge Cases

---

## Performance Testing

- [ ] Upload 50MB file → Should complete in < 2 minutes
- [ ] Load document list with 100 documents → Should load in < 3 seconds
- [ ] Search documents → Should return results in < 1 second
- [ ] Access via share code → Should load in < 2 seconds
- [ ] Export logs (1000 entries) → Should export in < 5 seconds

---

## Security Testing

- [ ] Verify share codes are hashed (not plain text)
- [ ] Verify users cannot access other users' documents
- [ ] Verify API routes require authentication (where needed)
- [ ] Verify rate limiting works
- [ ] Verify suspicious activity detection works
- [ ] Verify Firestore rules enforced
- [ ] Verify Storage rules enforced

---

## Completion Checklist

- [ ] All tests passed
- [ ] No errors in console
- [ ] No errors in Firebase logs
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for production

---

**Testing Date:** _______________
**Tested By:** _______________
**Environment:** Development / Production
**Notes:** _______________

