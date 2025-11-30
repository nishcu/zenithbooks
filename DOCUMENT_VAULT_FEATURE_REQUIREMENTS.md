# 📁 Document Vault Feature - Complete Requirements (REVISED)

## 🎯 Feature Overview

**Document Vault** - A secure, centralized document storage and sharing system where users can upload, organize, and securely share their important documents with authorized third parties (bankers, financial institutions, etc.) using multiple secret code mechanisms with automatic expiry.

**Key Innovation:** First time in India - secure document sharing without physical documents, email attachments, or mobile document sharing. Controlled, secure access to authorized parties only.

---

## ✨ Core Features

### 1. **Document Upload & Storage with Versioning**
- Users can upload various types of documents
- Documents stored securely in Firebase Storage
- Support for multiple file formats: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX
- **Document versioning:** When user uploads new version of same document, all versions are kept in history
- Latest version shown by default, but all versions accessible to owner
- File size limits:
  - **Maximum per document:** 50 MB
  - **Total storage per user:** 5 GB
- Automatic compression for large files when possible

### 2. **Category-Based Organization**
Documents organized into **14 categories**:

| Category | Document Types | Examples |
|----------|---------------|----------|
| **Income Tax** | Tax-related documents | ITR, Form 16, Form 16A, Form 26AS, Advance Tax, Tax Assessment Orders, Tax Refunds, Tax Audit Reports, Tax Notices |
| **GST** | GST-related documents | GST Registration Certificate, GSTR-1, GSTR-3B, GSTR-9, GSTR-9C, GST Notices, GST Refunds, E-Way Bills |
| **MCA** | MCA/Company documents | Incorporation Certificate, MOA, AOA, Board Resolutions, Annual Returns, ROC Filings, DIN, DSC |
| **Registrations & Licenses** | Registration documents | PAN Card, Aadhaar, UDYAM, Trade License, Shop & Establishment, IEC, Professional Tax, Labor License, FSSAI |
| **Policies & Insurance** | Policy documents | Life Insurance, Health Insurance, Term Insurance, Vehicle Insurance, Property Insurance, Business Insurance, Professional Indemnity |
| **Personal Documents** | Personal documents | School/College Fees Receipts, RC (Vehicle Registration), Driving License, Passport, Birth Certificate, Marriage Certificate, Educational Certificates, Medical Reports |
| **Banking & Financial** | Banking documents | Bank Statements (Savings/Current/Credit Card), Account Opening Forms, FD/RD Certificates, Loan Documents, CIBIL Reports, Investment Statements |
| **Legal Documents** | Legal documents | Partnership Deed, Service Agreement, Rental Agreement, Loan Agreement, NDA, Employment Contracts, Vendor Agreements, Shareholders Agreement, Lease Deed |
| **Property & Real Estate** | Property documents | Sale Deed, Purchase Agreement, Registration Documents, Property Tax Receipts, Valuation Reports, Home Loan Documents, Property Insurance |
| **Compliance & Certifications** | Compliance documents | ISO Certificates, Quality Certifications, Environmental Clearances, Fire Safety, Pollution Control, Factory License |
| **Contracts & Agreements** | Contract documents | Service Contracts, Vendor Contracts, Client Agreements, Franchise Agreements, Distribution Agreements, Consulting Agreements |
| **Financial Statements & Reports** | Financial documents | Balance Sheet, P&L Statement, Cash Flow Statement, CMA Report, Audit Reports, Financial Projections |
| **Payroll & HR** | HR documents | Salary Slips, Form 16 (Employee), Appointment Letters, Offer Letters, Resignation Letters, Experience Certificates |
| **Others** | Miscellaneous | Any document that doesn't fit above categories, custom documents, miscellaneous files |

### 3. **Multiple Secret Code-Based Sharing System**

#### **User Side (Document Owner)**
- User can create **MULTIPLE secret codes** simultaneously for different purposes
- Each code can have:
  - **Custom name/description** (e.g., "Housing Loan - HDFC Bank", "Business Loan - SBI", "Tax Audit - CA")
  - **Selected categories** to share (checkboxes for each category)
  - **Automatic 5-day expiry** from creation date
  - Independent expiry timer per code
- User can manage (view, edit, delete) all their share codes
- Example: For Housing Loan application, user creates code "HOUSE2024" with:
  - ✅ Income Tax
  - ✅ GST
  - ✅ MCA
  - ✅ Banking
  - ❌ Personal Documents (not shared)
  - ❌ Policies (not shared)
  - Expires automatically in 5 days

#### **Third Party Side (Banker/Financial Institution)**
- Third party visits ZenithBooks public access portal
- Enters the **secret code** provided by the user
- If code is correct and **not expired**, they can:
  - View documents in shared categories only (for that specific code)
  - **Download documents** (core feature) from shared categories
  - See expiry countdown (remaining days/hours)
  - Cannot see non-shared categories at all
- **No login/authentication required** (code-based access only)
- Access **automatically expires after 5 days**
- If code expired: "Code expired. Please contact document owner."

### 4. **Security & Tracking Features**
- Documents protected by secret codes (multiple codes per user)
- Each share code has **5-day automatic expiry**
- **Access logging:** All document downloads/views are logged with:
  - Document name and category
  - Timestamp
  - IP address (for security)
  - Access type (view/download)
- **Notifications:** Document owner receives alerts when:
  - Documents are accessed/downloaded via share code
  - Code expires (1 day before expiry warning)
  - Code has expired
- User has full control over:
  - Which categories to share per code
  - Creating/deleting multiple codes
  - Viewing access logs (who accessed what, when)
  - Managing notification preferences

---

## 🏗️ Technical Architecture

### **Database Structure (Firestore)**

#### **Collection: `vaultDocuments`** (User's documents with versioning)
```
vaultDocuments/{userId}/documents/{documentId}/
  ├── fileName: string
  ├── category: string (Income Tax, GST, MCA, etc.)
  ├── currentVersion: number
  ├── totalStorageUsed: number (bytes)
  ├── uploadedAt: timestamp
  ├── lastUpdated: timestamp
  ├── metadata: {
  │     description: string (optional)
  │     documentDate: timestamp (optional)
  │     tags: array
  │   }
  └── versions/
      ├── {versionNumber}/
      │   ├── fileUrl: string (Firebase Storage path)
      │   ├── fileSize: number (bytes)
      │   ├── fileType: string (pdf, image, etc.)
      │   ├── uploadedAt: timestamp
      │   └── versionNote: string (optional, e.g., "Revised version")
```

#### **Collection: `vaultShareCodes`** (Multiple share codes per user)
```
vaultShareCodes/{shareCodeId}/
  ├── userId: string (owner)
  ├── codeName: string (e.g., "Housing Loan - HDFC")
  ├── secretCode: string (hashed with bcrypt)
  ├── sharedCategories: array (["Income Tax", "GST", "MCA", "Banking"])
  ├── createdAt: timestamp
  ├── expiresAt: timestamp (createdAt + 5 days)
  ├── isActive: boolean
  ├── accessCount: number (total downloads/views)
  ├── lastAccessedAt: timestamp
  └── description: string (optional)
```

#### **Collection: `vaultAccessLogs`** (Security tracking)
```
vaultAccessLogs/{logId}/
  ├── shareCodeId: string
  ├── userId: string (document owner)
  ├── accessedAt: timestamp
  ├── accessType: string ("view" | "download")
  ├── category: string (which category was accessed)
  ├── documentId: string (which document was accessed)
  ├── documentName: string
  ├── documentVersion: number
  ├── ipAddress: string (for security audit)
  ├── userAgent: string
  └── shareCodeName: string (for reference)
```

#### **Collection: `vaultNotifications`** (Owner notifications)
```
vaultNotifications/{notificationId}/
  ├── userId: string (document owner)
  ├── type: string ("access" | "expiry_warning" | "code_expired" | "storage_warning")
  ├── shareCodeId: string (if related to share code)
  ├── message: string
  ├── createdAt: timestamp
  ├── isRead: boolean
  ├── metadata: {
  │     documentName: string (if access notification)
  │     category: string
  │     expiresIn: string (if expiry warning)
  │   }
```

#### **Collection: `vaultSettings`** (User storage settings)
```
vaultSettings/{userId}/
  ├── totalStorageLimit: number (5 GB in bytes)
  ├── currentStorageUsed: number (bytes)
  ├── maxFileSize: number (50 MB in bytes)
  └── notificationPreferences: {
        accessAlerts: boolean (default: true)
        expiryWarnings: boolean (default: true)
        storageWarnings: boolean (default: true)
      }
```

### **Storage Structure (Firebase Storage) - With Versioning**
```
vault/{userId}/
  ├── income-tax/
  │   ├── {documentId}/
  │   │   ├── v1-itr-2024.pdf
  │   │   ├── v2-itr-2024-revised.pdf
  │   │   └── v3-itr-2024-final.pdf
  │   └── form-16-2024.pdf
  ├── gst/
  │   ├── {documentId}/
  │   │   ├── v1-gst-certificate.pdf
  │   │   └── v2-gst-certificate-updated.pdf
  │   └── gstr-3b-jan-2024.pdf
  ├── mca/
  ├── registrations/
  ├── policies/
  ├── personal/
  └── banking/
```

---

## 📱 User Interface

### **For Document Owners (Logged-in Users)**

#### **Page 1: Document Vault Dashboard** (`/vault`)
- View all uploaded documents organized by category
- Upload new documents with category selection
- **Upload new version** of existing document (keeps history)
- View document version history
- Delete/edit document metadata
- Search and filter documents
- Statistics:
  - Total documents count
  - Documents by category
  - Storage used / Storage limit (5 GB)
  - Recent uploads

#### **Page 2: Share Code Management** (`/vault/sharing`)
- **Create multiple share codes** (each with name/description)
- For each code:
  - Set custom code name (e.g., "Housing Loan - HDFC")
  - Generate/enter secret code (min 8 chars, alphanumeric)
  - Select categories to share (checkboxes for each category)
  - See 5-day expiry timer (countdown)
- List all active share codes with:
  - Code name
  - Expiry countdown
  - Access count
  - Last accessed timestamp
  - Status (Active/Expired)
- View/edit/delete individual codes
- **Access Logs Viewer:**
  - Filter by share code
  - Filter by category
  - Filter by date range
  - Shows: Document name, category, access type, timestamp, IP
- **Notifications Center:**
  - Access alerts (when documents accessed)
  - Expiry warnings (1 day before)
  - Expired code alerts
  - Storage warnings (when approaching 5 GB limit)
- Generate share instructions for third parties:
  - "Visit zenithbooks.in/vault/access"
  - "Enter code: [CODE]"
  - "Code expires in [X] days"

### **For Third Parties (Public Access Page)**

#### **Page: Document Access Portal** (`/vault/access` - Public, No Login)
- Simple form to enter secret code
- After entering correct code (if valid and not expired):
  - Display only shared categories for that code
  - List documents in each shared category (latest versions)
  - **Download buttons** for each document (core feature)
  - View document details
  - **Expiry countdown** prominently displayed (e.g., "Expires in 3 days 12 hours")
  - Access automatically expires after 5 days
- Error messages for:
  - Invalid code: "Invalid code. Please check and try again."
  - Expired code: "Code expired. Please contact document owner."
  - Code not found: "Code not found."

---

## 🔒 Security & Access Control

### **Access Rules**

1. **Document Owner Access:**
   - Full access to all their documents and all versions
   - Can upload, view, download, delete documents
   - Can upload new versions (keeps history)
   - Can create multiple share codes
   - Can view access logs
   - Can manage/delete share codes
   - Receives notifications for all access activities

2. **Third Party Access (Via Secret Code):**
   - Only sees shared categories for that specific code
   - Can **download documents** (core feature) from shared categories
   - Sees latest version of documents only (version history not visible)
   - Cannot see non-shared categories at all
   - Access automatically expires after 5 days
   - Access revoked if code is deleted by owner
   - All access/download actions are logged
   - Owner receives notification when documents are accessed

3. **Code Management:**
   - Multiple secret codes per user supported
   - Each code stored as hash (bcrypt, never plain text)
   - Codes automatically expire after 5 days
   - User can create, edit, delete codes anytime
   - Deleting code immediately revokes access
   - Code strength validation:
     - Minimum 8 characters
     - Alphanumeric (letters + numbers)
     - Case-sensitive
   - Each code can have custom name/description

---

## 🎨 User Experience Flows

### **Scenario 1: User Uploads Documents**
1. User logs in → Navigates to Document Vault (`/vault`)
2. Clicks "Upload Document"
3. Selects file from device (max 50 MB)
4. Chooses category (Income Tax, GST, etc.)
5. Adds optional metadata (description, date, tags)
6. System validates file size and type
7. Uploads → Document saved to vault in selected category
8. Storage usage updated

### **Scenario 2: User Uploads New Version**
1. User goes to Document Vault
2. Clicks on existing document (e.g., "ITR-2024")
3. Clicks "Upload New Version"
4. Uploads updated file
5. System saves as version 2, keeps version 1 in history
6. All share codes now show latest version (v2)
7. User can view/download previous versions if needed
8. Version history preserved

### **Scenario 3: User Creates Share Code for Housing Loan**
1. User goes to Share Code Management (`/vault/sharing`)
2. Clicks "Create New Share Code"
3. Enters code name: "Housing Loan - HDFC Bank"
4. System generates or user enters secret code (e.g., "HOUSE2024")
5. Selects categories to share:
   - ✅ Income Tax
   - ✅ GST
   - ✅ MCA
   - ✅ Banking
   - ❌ Personal Documents
   - ❌ Policies
6. Code created with 5-day expiry timer (expires on [date])
7. User shares instructions with banker:
   - "Visit zenithbooks.in/vault/access"
   - "Enter code: HOUSE2024"
   - "Code expires in 5 days"
8. Banker uses code → Sees only selected categories

### **Scenario 4: Third Party Accesses Documents**
1. Banker visits `/vault/access` (public page)
2. Enters secret code: "HOUSE2024"
3. Code validated → Shows:
   - Shared categories (Income Tax, GST, MCA, Banking)
   - **Expiry countdown** prominently displayed (e.g., "Expires in 3 days 12 hours")
   - Documents in each category (latest versions only)
4. Banker clicks "Download" on documents → Files downloaded
5. **Access logged** → Entry created in `vaultAccessLogs`
6. **Owner receives notification** → Alert in notifications center
7. Cannot see Personal Documents or Policies (not shared)
8. Cannot see document version history

### **Scenario 5: User Views Access Logs & Notifications**
1. User goes to Share Code Management
2. Clicks on share code "Housing Loan - HDFC Bank"
3. Views "Access Logs" tab:
   - "Document ITR-2024.pdf downloaded on Jan 15, 2024 at 2:30 PM"
   - "Document GST-Certificate.pdf downloaded on Jan 15, 2024 at 2:35 PM"
   - Shows: IP address, access type, timestamp
4. Views "Notifications" tab:
   - "Alert: Documents accessed via code HOUSE2024" (Jan 15, 2:30 PM)
   - "Alert: Code expires in 1 day" (Jan 19, 9:00 AM)
   - "Alert: Code has expired" (Jan 20, 9:00 AM)

### **Scenario 6: Share Code Expires**
1. 5 days pass since code creation
2. Code automatically expires (isActive: false)
3. Third party trying to access sees: "Code expired. Please contact document owner."
4. User receives notification: "Share code 'Housing Loan - HDFC Bank' has expired"
5. User can create new code if needed (old code remains in list but marked as expired)

### **Scenario 7: Multiple Share Codes**
1. User creates code "HOUSE2024" for Housing Loan (shares: Income Tax, GST, MCA, Banking)
2. User creates code "BUSINESS2024" for Business Loan (shares: GST, MCA, Banking)
3. User creates code "TAXAUDIT2024" for Tax Audit (shares: Income Tax, GST, Registrations)
4. Each code has independent:
   - Categories
   - 5-day expiry timer
   - Access logs
   - Notifications
5. User manages all codes from dashboard

---

## 📋 Feature Implementation Checklist

### **Phase 1: Core Upload & Storage**
- [ ] Document upload functionality (50MB max per file, 5GB total)
- [ ] Category-based organization (7 categories)
- [ ] File storage in Firebase Storage
- [ ] Document listing by category
- [ ] Document delete/edit functionality
- [ ] **Document versioning system** (keep history)
- [ ] File type validation (PDF, images, Office docs)
- [ ] File size validation
- [ ] Storage usage tracking
- [ ] Storage limit enforcement (5 GB)

### **Phase 2: Multiple Share Codes**
- [ ] Create multiple share codes per user
- [ ] Code naming/description feature
- [ ] Category selection per code (checkboxes)
- [ ] **5-day automatic expiry** system
- [ ] Expiry countdown display
- [ ] Code management (view, edit, delete)
- [ ] Code hashing with bcrypt
- [ ] Code strength validation

### **Phase 3: Sharing Mechanism**
- [ ] Public access page for third parties (`/vault/access`)
- [ ] Code validation and expiry checking
- [ ] Document filtering by shared categories
- [ ] **Download functionality** (core feature)
- [ ] Expiry countdown display for third parties
- [ ] Error messages (invalid/expired code)

### **Phase 4: Access Logging & Security**
- [ ] Access log creation on every download/view
- [ ] Track: document accessed, category, timestamp, IP address
- [ ] Access logs display for document owner
- [ ] Filter logs by code, category, date range
- [ ] Security audit trail

### **Phase 5: Notification System**
- [ ] Notification when documents accessed/downloaded
- [ ] Notification when code expires (exact expiry time)
- [ ] Notification for expiry warnings (1 day before)
- [ ] Notification for storage warnings (approaching 5 GB)
- [ ] Notification center in UI
- [ ] Mark notifications as read/unread

### **Phase 6: UI/UX Enhancement**
- [ ] Intuitive upload interface
- [ ] Category-wise document organization
- [ ] Document version history viewer
- [ ] Search and filter functionality
- [ ] Share code management dashboard
- [ ] Access logs viewer with filters
- [ ] Notifications center
- [ ] Third-party access portal design
- [ ] Mobile-responsive design
- [ ] Storage usage indicators

---

## ✅ Confirmed Requirements Summary

1. **Access Expiry:** ✅ **5-day automatic expiry** for all share codes
2. **Multiple Share Codes:** ✅ Users can create **multiple share codes** simultaneously
3. **Download Permissions:** ✅ **Download is the core feature** for third parties
4. **Access Logging:** ✅ **All access/download actions are logged** for security
5. **File Size Limits:** ✅ **50 MB per file, 5 GB total storage** per user
6. **Document Versioning:** ✅ **Version history maintained** - all versions kept
7. **Notification System:** ✅ **Owner notified** when documents accessed, code expires, etc.

---

## 🚨 Important Considerations

### **Security**
1. Secret codes must be hashed with bcrypt (never stored in plain text)
2. All access/download actions logged for audit purposes
3. File uploads validated (type, size, virus scan if possible)
4. HTTPS only for all document access
5. IP address logging for security audit

### **Privacy**
1. Users have full control over what to share (category-wise)
2. Non-shared categories completely hidden from third parties
3. Expired codes automatically revoked
4. Code deletion immediately revokes access
5. Version history not visible to third parties (latest only)

### **Scalability**
1. File storage uses Firebase Storage
2. File compression for large documents
3. Pagination for document lists and access logs
4. CDN for fast document delivery
5. Efficient database queries with proper indexing

### **User Experience**
1. Clear instructions for third parties
2. Mobile-responsive design
3. Easy category management
4. Intuitive upload process
5. Clear expiry countdown displays
6. Easy share code management

---

## 🎯 Ready for Development

All requirements have been confirmed, clarified, and documented.

**Key Features:**
- ✅ Multiple share codes per user
- ✅ 5-day automatic expiry
- ✅ Download functionality (core feature)
- ✅ Complete access logging
- ✅ File size limits (50MB/file, 5GB total)
- ✅ Document versioning with history
- ✅ Notification system for access alerts
- ✅ Category-wise sharing control

**Development can begin upon approval!** 🚀
