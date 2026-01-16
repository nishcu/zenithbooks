# ITR Filing Module - Implementation Phases

## Architecture Overview

```
User Submits ITR Application
    ↓
Admin Dashboard (Super Admin)
    ├─ View all submitted applications
    └─ Assign to Professional/CA Team Member
    ↓
Professional Panel (CA Team Dashboard)
    ├─ View assigned applications only
    ├─ Download AIS/26AS
    ├─ Generate ITR Draft
    └─ File ITR
    ↓
User Approval & Final Completion
```

---

## ✅ PHASE 0: COMPLETED (Foundation)

### What's Done:
- ✅ Core types and interfaces
- ✅ Encryption utilities (AES-256)
- ✅ Firestore service functions
- ✅ User onboarding flow (document upload + credentials)
- ✅ Application detail page (user view)
- ✅ Navigation integration
- ✅ API endpoints (encrypt/decrypt)

---

## 📋 PHASE 1: ADMIN DASHBOARD - ITR APPLICATIONS MANAGEMENT

### Status: ⏳ **PENDING**

### Location:
- `src/app/(app)/admin/itr-applications/page.tsx`
- Add to admin menu: `/admin/itr-applications`

### Features to Build:

#### 1.1 ITR Applications List Page
**File**: `src/app/(app)/admin/itr-applications/page.tsx`

**Features**:
- [ ] List all ITR applications from all users
- [ ] Filters:
  - [ ] Status filter (UPLOADED, DATA_FETCHING, etc.)
  - [ ] Financial Year filter
  - [ ] Date range filter
  - [ ] Assigned/Unassigned filter
- [ ] Sort options (Newest first, Oldest first, Status)
- [ ] Search by PAN, Application ID, User name
- [ ] Status badges with colors
- [ ] Quick stats cards:
  - [ ] Total Applications
  - [ ] Pending Assignment
  - [ ] In Progress
  - [ ] Completed This Month

**Table Columns**:
- Application ID
- User Name (from users collection)
- PAN Number
- Financial Year
- Status
- Assigned To (Professional name or "Unassigned")
- Created Date
- Actions (View, Assign, Status Update)

#### 1.2 Application Detail View (Admin)
**File**: `src/app/(app)/admin/itr-applications/[id]/page.tsx`

**Features**:
- [ ] View complete application details
- [ ] View uploaded documents
- [ ] View credentials (masked, not decrypted)
- [ ] Assignment section:
  - [ ] Current assignment status
  - [ ] Dropdown to select professional
  - [ ] Fetch professionals from `professionals` collection (where `userType === 'professional'`)
  - [ ] Assign button
  - [ ] Re-assign functionality
- [ ] Status update dropdown
- [ ] Activity log/timeline
- [ ] User contact information

#### 1.3 Assignment Dialog/Modal
**File**: `src/components/admin/assign-itr-dialog.tsx`

**Features**:
- [ ] Search/filter professionals
- [ ] Show professional details (name, email, current workload)
- [ ] Assignment confirmation
- [ ] Update Firestore: `itrApplications/{id}.assignedTo = professionalId`
- [ ] Trigger notification to assigned professional
- [ ] Update application status to "ASSIGNED" or "DATA_FETCHING"

#### 1.4 Firestore Updates Needed
**Update**: `src/lib/itr/firestore.ts`

Add to `ITRApplication` type:
```typescript
assignedTo?: string; // Professional UID
assignedAt?: Date;
assignedBy?: string; // Admin UID
```

**New Functions**:
- [ ] `assignITRApplication(applicationId, professionalId, adminId)`
- [ ] `getAssignedApplications(professionalId)`
- [ ] `getUnassignedApplications()`
- [ ] `getAllITRApplicationsForAdmin(filters)`

#### 1.5 Admin Menu Update
**Update**: `src/app/(app)/layout.tsx`

Add to admin subItems:
```typescript
{ href: "/admin/itr-applications", label: "ITR Applications", icon: FileSignature, roles: ['super_admin'] }
```

---

## 📋 PHASE 2: PROFESSIONAL PANEL - CA TEAM DASHBOARD

### Status: ⏳ **PENDING**

### Location:
- `src/app/(app)/professional/itr-applications/page.tsx`
- Add to professional menu (only visible for `userType === 'professional'`)

### Features to Build:

#### 2.1 CA Team Dashboard (Main Page)
**File**: `src/app/(app)/professional/itr-applications/page.tsx`

**Features**:
- [ ] Show only applications assigned to logged-in professional
- [ ] Filters:
  - [ ] Status filter
  - [ ] Financial Year
- [ ] Quick stats:
  - [ ] Total Assigned
  - [ ] In Progress
  - [ ] Completed
  - [ ] Pending AIS Download
- [ ] Table with assigned applications
- [ ] Action buttons per row:
  - [ ] View Details
  - [ ] Download AIS/26AS
  - [ ] Generate Draft
  - [ ] File ITR

#### 2.2 Assigned Application Detail Page
**File**: `src/app/(app)/professional/itr-applications/[id]/page.tsx`

**Features**:
- [ ] View application details (read-only for user info)
- [ ] **Download Credentials** button:
  - [ ] Show decrypted username/password
  - [ ] Log access to Firestore
  - [ ] Copy to clipboard functionality
- [ ] **Download AIS/26AS** section:
  - [ ] Button to trigger AIS download
  - [ ] Status indicator (Not Started, In Progress, Completed)
  - [ ] Download links for downloaded files
- [ ] View uploaded documents
- [ ] Status update dropdown (for CA team)
- [ ] Comments/Notes section (CA team can add internal notes)

#### 2.3 AIS/26AS Download Workflow
**File**: `src/app/api/itr/download-ais/route.ts` (Server-side)

**Features**:
- [ ] Verify professional has access to application
- [ ] Get decrypted credentials
- [ ] Login to Income Tax Portal (automated)
- [ ] Download:
  - [ ] AIS PDF
  - [ ] AIS JSON
  - [ ] Form 26AS PDF
  - [ ] TIS (if available)
- [ ] Upload to Firebase Storage:
  - [ ] Path: `itr/{userId}/{applicationId}/ais/`
- [ ] Create `itrDocuments` records
- [ ] Update application status to "AIS_DOWNLOADED"
- [ ] Trigger draft generation automatically

**Note**: This requires:
- Puppeteer/Playwright for browser automation
- Or Income Tax Portal API (if available)
- Server-side execution only

**Alternative Approach** (If automation not possible):
- [ ] Manual upload interface
- [ ] CA team downloads manually and uploads to system

#### 2.4 Professional Menu Update
**Update**: `src/app/(app)/layout.tsx`

Add new section for professionals:
```typescript
{
  label: "ITR Management",
  icon: FileSignature,
  roles: ['professional'], // Only for userType === 'professional'
  subItems: [
    { href: "/professional/itr-applications", label: "My ITR Applications", icon: FileText },
    { href: "/professional/itr-applications/completed", label: "Completed", icon: CheckCircle2 },
  ]
}
```

---

## 📋 PHASE 3: AI-BASED ITR DRAFT GENERATION

### Status: ⏳ **PENDING**

### Features to Build:

#### 3.1 OCR Extraction Service
**File**: `src/app/api/itr/ocr-extract/route.ts`

**Features**:
- [ ] Extract from Form 16 PDF:
  - [ ] Name
  - [ ] PAN
  - [ ] Employer TAN
  - [ ] Gross Salary
  - [ ] TDS Amount
  - [ ] Allowances
  - [ ] Deductions
- [ ] Use OpenAI Vision API or Tesseract OCR
- [ ] Return structured JSON

**Dependencies**:
- OpenAI API key
- PDF parsing library (`pdf-parse` or `pdfjs-dist`)
- Image processing (if Form 16 is scanned)

#### 3.2 AIS JSON Parser
**File**: `src/lib/itr/ais-parser.ts`

**Features**:
- [ ] Parse AIS JSON structure
- [ ] Extract:
  - [ ] Salary income (TDS)
  - [ ] Interest income
  - [ ] Dividend income
  - [ ] Other incomes
- [ ] Map to ITR format

#### 3.3 26AS PDF Parser
**File**: `src/lib/itr/form26as-parser.ts`

**Features**:
- [ ] Parse Form 26AS PDF
- [ ] Extract TDS details
- [ ] Extract advance tax
- [ ] Extract self-assessment tax

#### 3.4 Tax Calculation Engine
**File**: `src/lib/itr/tax-calculator.ts`

**Features**:
- [ ] Calculate total income
- [ ] Apply deductions (80C, 80D, 24, etc.)
- [ ] Calculate taxable income
- [ ] Apply tax slabs (FY-specific)
- [ ] Calculate total tax
- [ ] Deduct TDS and advance tax
- [ ] Calculate refund/payable
- [ ] Generate tax computation summary

#### 3.5 Draft Generation API
**File**: `src/app/api/itr/generate-draft/route.ts`

**Workflow**:
1. [ ] Fetch application and all documents
2. [ ] Run OCR on Form 16
3. [ ] Parse AIS JSON
4. [ ] Parse 26AS PDF
5. [ ] Merge all data
6. [ ] Calculate tax
7. [ ] Detect mismatches (TDS vs AIS, etc.)
8. [ ] Calculate scrutiny risk score
9. [ ] Generate draft JSON
10. [ ] Save to `itrDrafts` collection
11. [ ] Update application status to "DRAFT_READY"
12. [ ] Send notification to user

**Output Structure**:
```typescript
{
  income: { ... },
  deductions: { ... },
  tax: { ... },
  mismatches: [ ... ],
  comments: [ ... ],
  scrutinyRisk: "LOW" | "MEDIUM" | "HIGH"
}
```

#### 3.6 Manual Draft Editor (CA Team)
**File**: `src/app/(app)/professional/itr-applications/[id]/draft/page.tsx`

**Features**:
- [ ] View generated draft
- [ ] Edit income fields
- [ ] Edit deduction fields
- [ ] Add comments/notes
- [ ] Recalculate tax on changes
- [ ] Save draft updates
- [ ] Approve draft for user review
- [ ] Mark as ready for user approval

---

## 📋 PHASE 4: USER APPROVAL SYSTEM

### Status: ⏳ **PENDING**

### Features to Build:

#### 4.1 Draft Review Page (User)
**File**: `src/app/(app)/itr-filing/[id]/review/page.tsx`

**Features**:
- [ ] Display complete draft:
  - [ ] Income summary (breakdown)
  - [ ] Deductions summary (breakdown)
  - [ ] Tax calculation
  - [ ] Refund/Payable amount
- [ ] Highlight mismatches (with explanations)
- [ ] Show CA team comments
- [ ] Comment section (user can ask questions)
- [ ] Download draft PDF
- [ ] Actions:
  - [ ] **Approve Draft** button
  - [ ] **Request Changes** button (with comment input)
- [ ] On approval:
  - [ ] Update draft status to "APPROVED"
  - [ ] Update application status to "USER_APPROVED"
  - [ ] Notify CA team
  - [ ] Enable filing workflow

#### 4.2 Draft PDF Generator
**File**: `src/lib/itr/draft-pdf-generator.ts`

**Features**:
- [ ] Generate PDF from draft JSON
- [ ] Include all income, deductions, tax details
- [ ] Professional formatting
- [ ] Add headers/footers
- [ ] Save to Firebase Storage
- [ ] Return download URL

---

## 📋 PHASE 5: FINAL FILING WORKFLOW

### Status: ⏳ **PENDING**

### Features to Build:

#### 5.1 Filing Page (CA Team)
**File**: `src/app/(app)/professional/itr-applications/[id]/filing/page.tsx`

**Features**:
- [ ] ITR Form Type selection (ITR-1, ITR-2, etc.)
- [ ] XML/JSON file upload (ITR file)
- [ ] Filing status tracker:
  - [ ] File Uploaded
  - [ ] Filed
  - [ ] E-Verification Pending
  - [ ] E-Verification Completed
- [ ] E-Verification section:
  - [ ] Method selection (Aadhaar OTP, Net Banking)
  - [ ] OTP input (if Aadhaar)
  - [ ] Verification status
- [ ] Upload ITR-V
- [ ] Upload Filing Acknowledgement
- [ ] Update application status:
  - [ ] "FILING_IN_PROGRESS"
  - [ ] "FILED"
  - [ ] "E_VERIFIED"
  - [ ] "COMPLETED"

#### 5.2 Filing API
**File**: `src/app/api/itr/file-itr/route.ts`

**Features**:
- [ ] Verify professional access
- [ ] Validate ITR file format
- [ ] Upload to Income Tax Portal (if API available)
- [ ] Or store for manual filing
- [ ] Update application status
- [ ] Send notifications

---

## 📋 PHASE 6: NOTIFICATIONS & WHATSAPP

### Status: ⏳ **PENDING**

### Features to Build:

#### 6.1 Notification Service
**File**: `src/lib/itr/notifications.ts`

**Features**:
- [ ] Email notifications:
  - [ ] Draft ready
  - [ ] Filing started
  - [ ] Filing completed
  - [ ] Refund updates
- [ ] WhatsApp notifications (same events)
- [ ] In-app notifications
- [ ] Notification preferences (user settings)

#### 6.2 WhatsApp Integration
**File**: `src/app/api/itr/send-whatsapp/route.ts`

**Features**:
- [ ] Integrate with WhatsApp Business API or Twilio
- [ ] Template messages:
  - [ ] "Your ITR draft for FY {year} is ready. Please review and approve."
  - [ ] "Your ITR has been filed successfully. Acknowledgement: {number}"
  - [ ] "Refund of ₹{amount} has been credited to your account."
- [ ] Send notification on status changes
- [ ] Delivery tracking

**Dependencies**:
- WhatsApp Business API credentials
- Or Twilio WhatsApp API

---

## 📋 PHASE 7: DOCUMENT LOCKER INTEGRATION

### Status: ⏳ **PENDING**

### Features to Build:

#### 7.1 Auto-Organization
**Update**: Existing vault system

**Features**:
- [ ] Create folder structure: `ITR/{FinancialYear}/{ApplicationId}/`
- [ ] Auto-organize documents:
  - [ ] Form 16 → `form16/`
  - [ ] AIS → `ais/`
  - [ ] 26AS → `26as/`
  - [ ] ITR Draft → `draft/`
  - [ ] ITR-V → `filing/itrv/`
  - [ ] Acknowledgement → `filing/acknowledgement/`
- [ ] Link to existing vault categories

#### 7.2 Document Access
**File**: Update `src/app/(app)/my-documents/page.tsx`

**Features**:
- [ ] Show ITR documents under "Income Tax" category
- [ ] Group by financial year
- [ ] Download all documents
- [ ] View in organized folders

---

## 📋 PHASE 8: REFUND TRACKING & HEALTH REPORT

### Status: ⏳ **PENDING**

### Features to Build:

#### 8.1 Refund Tracking Page
**File**: `src/app/(app)/itr-filing/[id]/refund/page.tsx`

**Features**:
- [ ] Refund status display:
  - [ ] Pending
  - [ ] Processing
  - [ ] Credited
  - [ ] Rejected
- [ ] Refund amount
- [ ] AI-predicted refund date
- [ ] Refund history/timeline
- [ ] Manual status update (CA team)

#### 8.2 Refund Status Checker
**File**: `src/app/api/itr/check-refund/route.ts` (Cron job)

**Features**:
- [ ] Check refund status from Income Tax Portal (if API available)
- [ ] Or manual update interface
- [ ] Update application refund info
- [ ] Send notification on status change

#### 8.3 AI Health Report Generator
**File**: `src/app/api/itr/generate-health-report/route.ts`

**Features**:
- [ ] Analyze income trends (multi-year)
- [ ] Detect AIS patterns:
  - [ ] Consistent income
  - [ ] Multiple employers
  - [ ] Irregular deposits
- [ ] Compliance flags:
  - [ ] Missing documents
  - [ ] TDS mismatches
  - [ ] Late filing
  - [ ] High scrutiny risk
- [ ] Investment recommendations:
  - [ ] Tax-saving investments
  - [ ] Retirement planning
  - [ ] Health insurance
- [ ] Generate PDF report
- [ ] Save to `itrHealthReports` collection

---

## 📋 PHASE 9: ROLE MANAGEMENT & SECURITY

### Status: ⏳ **PENDING**

### Features to Build:

#### 9.1 CA Team User Management
**File**: `src/app/(app)/admin/ca-team/page.tsx`

**Features**:
- [ ] List all CA team members
- [ ] Add CA team member (from professionals)
- [ ] Remove CA team member
- [ ] View workload per member
- [ ] Set permissions

#### 9.2 Role Checks
**Update**: Throughout the application

**Features**:
- [ ] Verify `userType === 'professional'` for CA dashboard
- [ ] Verify `isCAUser(uid)` for credential access
- [ ] Verify assignment for application access
- [ ] Add OTP verification for CA login (if required)

#### 9.3 Credential Auto-Deletion
**File**: `src/app/api/itr/cleanup-credentials/route.ts` (Cron job)

**Features**:
- [ ] Delete credentials after filing completion
- [ ] Or after 90 days of completion
- [ ] Log deletion event

---

## 📊 SUMMARY BY PRIORITY

### 🔴 HIGH PRIORITY (Must Have)
1. **Phase 1**: Admin Dashboard - Assignment
2. **Phase 2**: CA Team Dashboard - View & Download AIS
3. **Phase 3**: AI Draft Generation (at least basic version)
4. **Phase 4**: User Approval

### 🟡 MEDIUM PRIORITY (Should Have)
5. **Phase 5**: Filing Workflow
6. **Phase 6**: Notifications (Email first, WhatsApp later)
7. **Phase 7**: Document Locker Integration

### 🟢 LOW PRIORITY (Nice to Have)
8. **Phase 8**: Refund Tracking & Health Report
9. **Phase 9**: Advanced Role Management

---

## 🛠️ TECHNICAL DEPENDENCIES

### Required Services/APIs:
- [ ] OpenAI API (for OCR)
- [ ] WhatsApp Business API or Twilio
- [ ] Puppeteer/Playwright (for Income Tax Portal automation)
- [ ] PDF parsing libraries
- [ ] Tax calculation formulas (IT Act)

### Environment Variables Needed:
```env
ITR_ENCRYPTION_KEY=<32-byte hex>
OPENAI_API_KEY=<key>
WHATSAPP_API_KEY=<key>
FIREBASE_ADMIN_CREDENTIALS=<service-account>
```

---

## 📝 ESTIMATED COMPLEXITY

- **Phase 1** (Admin Dashboard): Medium (2-3 days)
- **Phase 2** (CA Dashboard): Medium (2-3 days)
- **Phase 3** (AI Draft): High (5-7 days)
- **Phase 4** (User Approval): Low (1-2 days)
- **Phase 5** (Filing): High (3-5 days)
- **Phase 6** (Notifications): Medium (2-3 days)
- **Phase 7** (Locker): Low (1 day)
- **Phase 8** (Refund/Health): Medium (3-4 days)
- **Phase 9** (Roles): Low (1 day)

**Total Estimated**: ~20-30 days

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Start with Phase 1** (Admin Dashboard)
2. Then **Phase 2** (CA Dashboard)
3. Then **Phase 3** (Draft Generation - start with basic version)

