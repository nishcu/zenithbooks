# Pre-Launch Testing Guide for ZenithBooks

## 🎯 Critical Path Testing (MUST TEST BEFORE LAUNCH)

### 1. Authentication & User Management ⚠️ CRITICAL
- [ ] **Email/Password Signup**
  - [ ] Create new account
  - [ ] Verify user document created in Firestore
  - [ ] Verify userType and subscriptionPlan set correctly
  - [ ] Test with invalid email format
  - [ ] Test with weak password
  - [ ] Test with existing email (should fail)

- [ ] **Email/Password Login**
  - [ ] Login with valid credentials
  - [ ] Login with invalid credentials (should show friendly error)
  - [ ] Test account lockout (5 failed attempts = 15 min lockout)
  - [ ] Test password reset flow

- [ ] **Google Authentication**
  - [ ] Login with Google from login page
  - [ ] Signup with Google from signup page
  - [ ] Verify redirect works correctly
  - [ ] Verify user document created for new Google users

- [ ] **User Type & Subscription**
  - [ ] Verify Business Owner can see Business plan
  - [ ] Verify Professional user ONLY sees Professional plan
  - [ ] Verify Freemium restrictions work correctly

---

### 2. Payment Gateway Integration ⚠️ CRITICAL
- [ ] **Payment Flow**
  - [ ] Navigate to /pricing page
  - [ ] Click on paid plan (Business/Professional)
  - [ ] Verify Cashfree checkout modal opens
  - [ ] Test with test credentials (sandbox mode)
  - [ ] Complete payment flow
  - [ ] Verify redirect to /payment/success
  - [ ] Verify subscription status updated in Firestore
  - [ ] Verify user can access paid features after payment

- [ ] **Payment Error Handling**
  - [ ] Test payment cancellation
  - [ ] Test payment failure
  - [ ] Verify friendly error messages (not red/destructive)
  - [ ] Verify user can retry payment

- [ ] **Freemium User Behavior**
  - [ ] Verify freemium users see upgrade alerts (not error messages)
  - [ ] Verify upgrade alerts link to pricing page
  - [ ] Verify freemium users cannot access paid features

---

### 3. Document Vault Feature ⚠️ CRITICAL (NEW)
- [ ] **Document Upload**
  - [ ] Upload document from /vault page
  - [ ] Test all 14 categories available in dropdown
  - [ ] Verify file size limit (50 MB) enforced
  - [ ] Verify file type validation
  - [ ] Verify document appears in list after upload
  - [ ] Test uploading new version of existing document

- [ ] **Document Management**
  - [ ] View document
  - [ ] Download document (should download, not open in tab)
  - [ ] Edit document metadata
  - [ ] Delete document
  - [ ] View version history

- [ ] **Share Code System**
  - [ ] Create share code from /vault/sharing
  - [ ] Verify secret code generation
  - [ ] Select specific categories to share
  - [ ] Verify 5-day expiry date set correctly
  - [ ] Test accessing documents via /vault/access with share code
  - [ ] Verify third party can view/download only shared categories
  - [ ] Test expired share code (should show error)
  - [ ] Test invalid share code (rate limiting after 10 attempts)

- [ ] **Access Logs**
  - [ ] View access logs at /vault/logs
  - [ ] Verify logs show view/download actions
  - [ ] Test filtering by share code, category, date range
  - [ ] Verify suspicious activity detection works
  - [ ] Export logs to CSV

- [ ] **Rate Limiting**
  - [ ] Test rate limiting (10 failed attempts = 10 min lockout)
  - [ ] Verify valid codes reset rate limit
  - [ ] Verify friendly error messages with lockout time

---

### 4. Financial Summary Chart ⚠️ CRITICAL (RECENTLY FIXED)
- [ ] **Chart Display**
  - [ ] Navigate to dashboard
  - [ ] Verify "Financial Summary - Last 6 Months" chart displays
  - [ ] Verify chart shows 6 months of data
  - [ ] Verify month labels include year (e.g., "Jan 2024")
  - [ ] Verify Sales, Purchases, and Net bars display correctly
  - [ ] Test with no data (should show empty state message)
  - [ ] Test with existing invoice/bill data

- [ ] **Data Accuracy**
  - [ ] Create test invoices for last 2 months
  - [ ] Create test purchase bills for last 2 months
  - [ ] Verify amounts appear correctly in chart
  - [ ] Verify credit notes reduce sales
  - [ ] Verify debit notes reduce purchases

---

### 5. Invoice Management ⚠️ CRITICAL
- [ ] **Create Invoice**
  - [ ] Create invoice from /billing/invoices/new
  - [ ] Verify invoice appears in list
  - [ ] Verify invoice ID format (INV-YYYYMMDD-XXX)
  - [ ] Test with GST and without GST
  - [ ] Verify totals calculated correctly

- [ ] **Bulk Upload** (Paid feature)
  - [ ] Verify freemium users see upgrade alert
  - [ ] Verify paid users can access bulk upload
  - [ ] Test bulk upload with Excel file

---

### 6. Core Accounting Features
- [ ] **Journal Entries**
  - [ ] Create journal entry
  - [ ] Verify entry appears in journal list
  - [ ] Verify calculations (debits = credits)

- [ ] **Financial Reports**
  - [ ] Generate Trial Balance
  - [ ] Generate Balance Sheet
  - [ ] Generate Profit & Loss
  - [ ] Verify PDF export works
  - [ ] Verify share functionality works

- [ ] **GST Filings**
  - [ ] Access GSTR-1 wizard
  - [ ] Access GSTR-3B wizard
  - [ ] Verify data populates correctly
  - [ ] Test PDF export

---

### 7. Admin Features
- [ ] **Service Pricing Management**
  - [ ] Access /admin/service-pricing
  - [ ] Update pricing for CA certificates or legal documents
  - [ ] Verify pricing updates in real-time on user-facing pages
  - [ ] Test with individual service pages

---

### 8. UI/UX & Responsiveness
- [ ] **Mobile Testing**
  - [ ] Test on mobile device or browser mobile view
  - [ ] Verify bottom navigation works
  - [ ] Verify sidebar collapses on mobile
  - [ ] Verify forms are usable on mobile
  - [ ] Verify charts/responsive (Financial Summary)
  - [ ] Verify Document Vault upload works on mobile

- [ ] **Desktop Testing**
  - [ ] Test on Chrome, Firefox, Safari, Edge
  - [ ] Verify sidebar navigation works
  - [ ] Verify all dialogs/modals open correctly
  - [ ] Verify dropdown menus (category select) appear above dialogs

- [ ] **Accessibility**
  - [ ] Test keyboard navigation
  - [ ] Verify ARIA labels present
  - [ ] Verify form errors are announced

---

### 9. Error Handling & Edge Cases
- [ ] **Network Errors**
  - [ ] Test with network disconnected
  - [ ] Verify friendly error messages
  - [ ] Verify retry mechanisms work

- [ ] **Firestore Indexes**
  - [ ] Verify all required indexes are deployed
  - [ ] Test queries that require indexes:
    - [ ] Document Vault queries (userId + uploadedAt)
    - [ ] Access Logs queries (userId + accessedAt)
    - [ ] Share Code queries

- [ ] **Empty States**
  - [ ] Test pages with no data (empty invoices, empty vault, etc.)
  - [ ] Verify helpful empty state messages
  - [ ] Verify CTAs work (e.g., "Create first invoice")

---

### 10. Security & Performance
- [ ] **Rate Limiting**
  - [ ] Test share code validation rate limiting
  - [ ] Test login rate limiting (account lockout)
  - [ ] Verify rate limits reset correctly

- [ ] **Firestore Security Rules**
  - [ ] Verify users can only access their own data
  - [ ] Verify Document Vault documents are private
  - [ ] Verify share codes are properly secured

- [ ] **Storage Security Rules**
  - [ ] Verify Document Vault files are private
  - [ ] Verify files are stored in correct user folders

- [ ] **Performance**
  - [ ] Test page load times
  - [ ] Test with large datasets (100+ invoices)
  - [ ] Verify pagination works for large lists

---

## 🔍 Code Quality Checks

### TypeScript Errors
- [x] Fixed duplicate identifier errors
- [x] Fixed missing type definitions (non-blocking)
- [ ] Verify no runtime TypeScript errors in console

### Build Verification
- [ ] Run `npm run build` (should complete without errors)
- [ ] Verify no webpack errors
- [ ] Verify all pages compile correctly

### Console Errors
- [ ] Check browser console for errors
- [ ] Verify no Firebase auth errors
- [ ] Verify no Firestore query errors
- [ ] Verify no missing index errors (except known ones)

---

## 📋 Environment Variables Checklist

Verify these are set in production:
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `CASHFREE_APP_ID`
- [ ] `CASHFREE_SECRET_KEY`
- [ ] `NEXT_PUBLIC_APP_URL`

---

## 🚨 Known Issues to Verify Fixed

- [x] Financial Summary chart not displaying → **FIXED**
- [x] PDF downloads opening instead of downloading → **FIXED**
- [x] Rate limiting counting valid codes → **FIXED**
- [x] Share Codes icon missing → **FIXED**
- [x] Category dropdown appearing behind dialog → **FIXED**
- [ ] Email service integration (still placeholder) → **ACCEPTABLE**

---

## ✅ Quick Smoke Test (5-Minute Test)

If you only have 5 minutes, test these critical paths:

1. **Login** → Create account or login
2. **Dashboard** → Verify Financial Summary chart displays
3. **Invoice** → Create one invoice
4. **Vault** → Upload one document, create share code
5. **Payment** → Test payment flow (sandbox)

---

## 📝 Testing Notes

### Test Accounts Needed
- [ ] Freemium user account
- [ ] Business plan user account
- [ ] Professional plan user account
- [ ] Test payment cards (sandbox mode)

### Test Data Needed
- [ ] At least 5 invoices across 2-3 months
- [ ] At least 3 purchase bills
- [ ] At least 3 documents in vault
- [ ] At least 2 active share codes

---

## 🎯 Post-Testing Actions

After completing all tests:

1. **Document Issues Found**
   - Create list of bugs found
   - Prioritize by severity (Critical, High, Medium, Low)
   - Fix critical and high priority issues before launch

2. **Verify Fixes**
   - Re-test fixed issues
   - Ensure no regressions introduced

3. **Final Checklist**
   - All critical paths tested ✅
   - No blocking bugs ✅
   - Performance acceptable ✅
   - Security verified ✅

---

## 🚀 Launch Readiness Criteria

The application is ready for launch if:
- ✅ All critical path tests pass
- ✅ No blocking bugs found
- ✅ Payment gateway works in production mode
- ✅ Firestore indexes deployed
- ✅ Security rules deployed
- ✅ Environment variables configured
- ✅ Domain and SSL configured
- ✅ Error tracking configured (optional but recommended)

---

**Last Updated**: Today
**Next Review**: Before official launch
