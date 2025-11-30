# 🔐 How to Create Share Codes for Document Vault

## 📍 Where to Find Share Code Creation

### Main Location: Share Codes Page

**Path:** `/vault/sharing`

**How to Access:**
1. Login to ZenithBooks
2. Go to **Document Vault** in sidebar menu
3. Click **"Share Codes"** from the submenu
   - Or navigate directly to: `/vault/sharing`

---

## 🎯 Step-by-Step: Creating a Share Code

### Step 1: Navigate to Share Codes Page
- Click **"Document Vault"** in sidebar
- Click **"Share Codes"** (🔐 icon)
- URL: `/vault/sharing`

### Step 2: Click "Create Share Code"
- Look for the **"Create Share Code"** button (usually top-right)
- Click it to open the creation dialog

### Step 3: Fill in Share Code Details

**Required Fields:**
1. **Code Name** (e.g., "Housing Loan - HDFC Bank")
   - A descriptive name to identify the purpose
   
2. **Secret Code** (minimum 8 characters)
   - Option 1: Enter your own code manually
   - Option 2: Click "Generate Random Code" for auto-generation
   
3. **Categories to Share** (Checkboxes)
   - Select which document categories to share
   - Available categories:
     - ✅ Income Tax
     - ✅ GST
     - ✅ MCA
     - ✅ Registrations & Licenses
     - ✅ Policies & Insurance
     - ✅ Personal Documents
     - ✅ Banking & Financial
     - ✅ Legal Documents
     - ✅ Property & Real Estate
     - ✅ Compliance & Certifications
     - ✅ Contracts & Agreements
     - ✅ Financial Statements & Reports
     - ✅ Payroll & HR
     - ✅ Others

**Optional Fields:**
4. **Description** (Optional)
   - Add notes about the purpose (e.g., "For housing loan verification")

### Step 4: Create the Code
- Click **"Create"** button
- Code will be created and shown in your Share Codes list

### Step 5: Copy the Share Code ⚠️ IMPORTANT
- **Copy the code immediately!**
- It won't be shown again after creation
- Share this code with the third party (banker, auditor, etc.)

---

## 📋 Visual Guide

```
┌─────────────────────────────────────────┐
│  Share Codes                            │
│                                         │
│  [+ Create Share Code]  ← Click here   │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Create Share Code Dialog:         │ │
│  ├───────────────────────────────────┤ │
│  │ Code Name: [_______________]      │ │
│  │                                    │ │
│  │ Secret Code:                      │ │
│  │ [________] [Generate Random]      │ │
│  │                                    │ │
│  │ Select Categories:                │ │
│  │ ☑ Income Tax                      │ │
│  │ ☑ GST                             │ │
│  │ ☐ MCA                             │ │
│  │ ☐ Personal Documents              │ │
│  │ ... (all 14 categories)           │ │
│  │                                    │ │
│  │ Description (Optional):            │ │
│  │ [__________________________]      │ │
│  │                                    │ │
│  │ [Cancel]  [Create]                │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 💡 Example Use Cases

### Example 1: Housing Loan
**Code Name:** "Housing Loan - HDFC Bank"
**Categories:** Income Tax, GST, MCA, Banking & Financial
**Secret Code:** "HOUSE2024"
**Purpose:** Share financial documents with bank for loan approval

### Example 2: Tax Audit
**Code Name:** "Tax Audit 2024"
**Categories:** Income Tax, GST, MCA, Registrations & Licenses
**Secret Code:** (Auto-generated)
**Purpose:** Share tax documents with auditor

### Example 3: Business Loan
**Code Name:** "Business Loan - ICICI"
**Categories:** GST, MCA, Banking, Financial Statements
**Secret Code:** "BL2024ICICI"
**Purpose:** Share business documents for loan processing

---

## ⚙️ Share Code Features

### What Happens After Creation:
1. ✅ Code is created and saved
2. ✅ Code is **hashed** (never stored in plain text)
3. ✅ Expires automatically after **5 days**
4. ✅ Shows in your Share Codes list
5. ✅ Access count starts at 0

### Important Notes:
- ⚠️ **Copy the code immediately** - it won't be shown again
- ⚠️ **5-day expiry** - codes expire automatically
- ⚠️ **Category-specific** - only selected categories are shared
- ⚠️ **Secure** - codes are hashed, not stored in plain text

---

## 🔄 Managing Share Codes

### View All Codes:
- Go to `/vault/sharing`
- See all your share codes listed
- View expiry countdown for each
- See access count (how many times accessed)

### Edit Code:
- Click on a code in the list
- Update categories or description
- **Note:** Cannot change the secret code after creation

### Delete Code:
- Click delete button on a code
- Immediately revokes access for all third parties

### View Access Logs:
- Click "Access Logs" button on a code
- See who accessed documents, when, and what they downloaded

---

## 👥 Sharing with Third Parties

### After Creating the Code:

1. **Share these details:**
   - Share Code (e.g., "HOUSE2024")
   - Access URL: `https://zenithbooks.in/vault/access`
   - Expiry information (5 days from creation)

2. **Third Party Steps:**
   - Visit: `https://zenithbooks.in/vault/access`
   - Enter the share code
   - Click "Access Documents"
   - View/download documents from shared categories

---

## 🎨 Navigation Path

```
Login → Sidebar Menu → Document Vault → Share Codes
                                ↓
                        ┌───────────────┐
                        │ Document Vault│
                        └───────────────┘
                                │
                ┌───────────────┼───────────────┐
                ↓               ↓               ↓
         My Documents    Share Codes    Access Logs
         (/vault)      (/vault/sharing) (/vault/logs)
```

---

## ❓ Frequently Asked Questions

### Q: Can I create multiple share codes?
**A:** Yes! Create as many as you need for different purposes.

### Q: Can I change the secret code after creation?
**A:** No, but you can delete the old code and create a new one.

### Q: What if I forget the share code?
**A:** You can view the code name and expiry, but not the secret code itself. Create a new code if needed.

### Q: Can I extend the expiry period?
**A:** Currently set to 5 days. You can create a new code when the old one expires.

### Q: Can third parties see all my documents?
**A:** No, only documents in the categories you selected when creating the code.

---

## 🚀 Quick Start

1. **Navigate:** Sidebar → Document Vault → Share Codes
2. **Click:** "Create Share Code" button
3. **Enter:** Code name, secret code (or generate), select categories
4. **Create:** Click "Create" button
5. **Copy:** Save the code immediately
6. **Share:** Give code and URL to third party

---

**Ready to create your first share code?** Navigate to `/vault/sharing` now! 🔐

