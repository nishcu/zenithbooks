# 📚 How Different User Categories Access Files & Services in ZenithBooks

## 🎯 Overview

ZenithBooks uses a **two-tier system** to control access:
1. **User Type** (`userType`) - Who you are (Business Owner vs Professional)
2. **Subscription Plan** (`subscriptionPlan`) - What subscription you have

---

## 👥 User Categories & Access Levels

### 1️⃣ **FREEMIUM USERS** (`subscriptionPlan: "freemium"`)

**Who:** Users with free accounts (no paid subscription)

**What They Can Access:**
- ✅ **Core Billing Features** (FREE)
  - Create unlimited invoices
  - Purchase orders
  - Credit/Debit notes
  - Items & Parties management
  - Voice to Invoice

- ❌ **Locked Features** (Requires Business/Professional Plan)
  - Accounting Suite (Ledgers, Journals, Trial Balance)
  - Financial Statements (P&L, Balance Sheet)
  - GST Compliance tools
  - Income Tax tools
  - Reports

- 💰 **Paid Services** (Pay-per-use, regardless of plan)
  - CA Certificates (₹1,499 - ₹3,999 per certificate)
  - Legal Documents (₹499 - ₹19,999 per document)
  - CMA Reports (₹4,999 per report)
  - Notice Handling (₹2,999 - ₹3,999 per notice)

---

### 2️⃣ **BUSINESS PLAN USERS** (`subscriptionPlan: "business"`)

**Who:** Business owners paying ₹199/month or ₹1,999/year

**What They Can Access:**
- ✅ **Everything in Freemium, PLUS:**
  - Full Accounting Suite
  - Financial Statements (P&L, Balance Sheet)
  - GST Filing & Compliance
  - Income Tax Tools (TDS, Form 16, etc.)
  - Reports (CMA, Sales Analysis, etc.)

- 💰 **Paid Services** (Pay-per-use)
  - CA Certificates (₹1,499 - ₹3,999 per certificate)
  - Legal Documents (₹499 - ₹19,999 per document)
  - CMA Reports (₹4,999 per report)
  - Notice Handling (₹2,999 - ₹3,999 per notice)

---

### 3️⃣ **PROFESSIONAL PLAN USERS** (`subscriptionPlan: "professional"`)

**Who:** Users paying ₹499/month or ₹4,999/year

**What They Can Access:**
- ✅ **Everything in Business Plan, PLUS:**
  - Client Management Panel (manage multiple businesses)
  - Professional Profile (be discoverable by clients)
  - Priority Support

- ✅ **FREE Services** (Only for `userType: "professional"` + `subscriptionPlan: "professional"`)
  - CA Certificates: **FREE** ✅
  - Legal Documents: **FREE** ✅
  - CMA Reports: **FREE** ✅
  - Notice Handling: **FREE** ✅

- 💰 **If NOT Professional User Type:**
  - Business users on Professional Plan still pay for services

---

## 🔐 Access Control Logic

### How Access is Determined:

```
1. User logs in
   ↓
2. System fetches user data from Firestore:
   - userType: "business" | "professional" | null
   - subscriptionPlan: "freemium" | "business" | "professional" | null
   ↓
3. For PAID SERVICES (CA Certificates, Legal Documents, etc.):
   
   Step 1: Get base price from pricing configuration
   Step 2: Check if service is FREE:
      IF (userType === "professional" AND subscriptionPlan === "professional")
      THEN effectivePrice = 0 (FREE)
      ELSE effectivePrice = basePrice (PAY)
   Step 3: Show payment gate or direct access
```

---

## 💻 Technical Implementation

### Code Flow in Legal Documents (Example):

```typescript
// 1. Fetch user subscription info
const userSubscriptionInfo = await getUserSubscriptionInfo(user.uid);
// Returns: { userType: "professional", subscriptionPlan: "professional" }

// 2. Get base price from pricing service
const basePrice = pricing?.registration_deeds?.find(s => s.id === 'trust_deed')?.price || 0;
// Returns: 9999 (for Trust Deed)

// 3. Calculate effective price
const effectivePrice = getEffectiveServicePrice(
  basePrice,                                    // 9999
  userSubscriptionInfo.userType,               // "professional"
  userSubscriptionInfo.subscriptionPlan,       // "professional"
  "registration_deeds"                         // Service category
);
// Returns: 0 (FREE for professionals) or 9999 (PAY for others)

// 4. Show payment gate or direct access
if (effectivePrice > 0) {
  // Show CashfreeCheckout payment button
} else {
  // Show download button directly (FREE)
}
```

---

## 📊 Complete Access Matrix

| Service Category | Freemium User | Business Plan User | Professional Plan + Professional User Type |
|-----------------|---------------|-------------------|-------------------------------------------|
| **Core Billing** | ✅ FREE | ✅ FREE | ✅ FREE |
| **Accounting Suite** | ❌ Locked | ✅ FREE | ✅ FREE |
| **GST Tools** | ❌ Locked | ✅ FREE | ✅ FREE |
| **Income Tax Tools** | ❌ Locked | ✅ FREE | ✅ FREE |
| **CA Certificates** | 💰 Pay | 💰 Pay | ✅ **FREE** |
| **Legal Documents** | 💰 Pay | 💰 Pay | ✅ **FREE** |
| **CMA Reports** | 💰 Pay | 💰 Pay | ✅ **FREE** |
| **Notice Handling** | 💰 Pay | 💰 Pay | ✅ **FREE** |
| **Client Management** | ❌ N/A | ❌ N/A | ✅ FREE |

---

## 🎯 Real-World Examples

### Example 1: Business Owner (Freemium)
```
User Type: "business"
Subscription: "freemium"

Access:
✅ Can create invoices (FREE)
✅ Can manage items & parties (FREE)
❌ Cannot access Accounting Suite (locked)
💰 Must pay ₹2,499 for Net Worth Certificate
💰 Must pay ₹4,999 for Partnership Deed
```

### Example 2: Business Owner (Business Plan)
```
User Type: "business"
Subscription: "business"

Access:
✅ Can create invoices (FREE)
✅ Can access full Accounting Suite (FREE)
✅ Can generate P&L and Balance Sheet (FREE)
✅ Can file GST returns (FREE)
💰 Must pay ₹2,499 for Net Worth Certificate
💰 Must pay ₹4,999 for Partnership Deed
```

### Example 3: Professional User (Professional Plan) ⭐
```
User Type: "professional"
Subscription: "professional"

Access:
✅ Can create invoices (FREE)
✅ Can access full Accounting Suite (FREE)
✅ Can generate P&L and Balance Sheet (FREE)
✅ Can file GST returns (FREE)
✅ Net Worth Certificate: FREE (no payment)
✅ Partnership Deed: FREE (no payment)
✅ All CA Certificates: FREE
✅ All Legal Documents: FREE
✅ CMA Reports: FREE
✅ Notice Handling: FREE
✅ Can manage multiple clients (FREE)
```

### Example 4: Business Owner (Professional Plan)
```
User Type: "business"
Subscription: "professional"

Access:
✅ Can access all features (FREE)
💰 Must still PAY for CA Certificates (not free)
💰 Must still PAY for Legal Documents (not free)
💰 Must still PAY for CMA Reports (not free)

Reason: Only professionals (userType: "professional") get free services
```

---

## 🔑 Key Rules

### Rule 1: Free Services Eligibility
```
Service is FREE only if:
  ✅ userType === "professional" 
  AND 
  ✅ subscriptionPlan === "professional"
  
Otherwise: PAY base price
```

### Rule 2: Feature Access
```
Feature is accessible if:
  ✅ subscriptionPlan !== "freemium"
  
Otherwise: Show upgrade alert
```

### Rule 3: User Type Cannot Change
```
- userType is set during signup
- Cannot be changed by user
- Only admin can change it
```

---

## 📁 File Access Examples

### Legal Documents Access:

#### Trust Deed (Base Price: ₹9,999)
- **Freemium User:** Pay ₹9,999 → Show payment gate → After payment → Download
- **Business Plan User:** Pay ₹9,999 → Show payment gate → After payment → Download
- **Professional User + Professional Plan:** FREE → Direct download (no payment)

#### Board Resolutions (Base Price: ₹1,999)
- **Freemium User:** Pay ₹1,999 → Show payment gate → After payment → Download
- **Business Plan User:** Pay ₹1,999 → Show payment gate → After payment → Download
- **Professional User + Professional Plan:** FREE → Direct download (no payment)

### CA Certificates Access:

#### Net Worth Certificate (Base Price: ₹2,499)
- **Freemium User:** Pay ₹2,499 → Show payment gate → After payment → Download
- **Business Plan User:** Pay ₹2,499 → Show payment gate → After payment → Download
- **Professional User + Professional Plan:** FREE → Direct download (no payment)

---

## 🛠️ How It Works Behind the Scenes

### Step-by-Step Process:

1. **User Navigates to a Service Page**
   - Example: `/legal-documents/trust-deed`

2. **Page Loads and Fetches Data:**
   ```typescript
   // Fetch user authentication
   const [user] = useAuthState(auth);
   
   // Fetch user subscription info
   const userSubscriptionInfo = await getUserSubscriptionInfo(user.uid);
   // Returns: { userType: "professional", subscriptionPlan: "professional" }
   
   // Fetch pricing configuration
   const pricing = await getServicePricing();
   // Returns: { registration_deeds: [{ id: "trust_deed", price: 9999 }] }
   ```

3. **Calculate Effective Price:**
   ```typescript
   const basePrice = pricing.registration_deeds.find(s => s.id === 'trust_deed')?.price || 0;
   // basePrice = 9999
   
   const effectivePrice = getEffectiveServicePrice(
     basePrice,
     userSubscriptionInfo.userType,
     userSubscriptionInfo.subscriptionPlan,
     "registration_deeds"
   );
   // effectivePrice = 0 (FREE) for professionals
   // effectivePrice = 9999 (PAY) for others
   ```

4. **Render UI Based on Price:**
   ```typescript
   if (effectivePrice > 0) {
     // Show payment checkout
     <CashfreeCheckout amount={effectivePrice} ... />
   } else {
     // Show download button directly
     <ShareButtons contentRef={printRef} ... />
   }
   ```

---

## 💡 Summary

1. **Freemium Users:** 
   - Free basic billing features
   - Pay for all premium services

2. **Business Plan Users:**
   - Free access to all accounting/compliance features
   - Still pay for CA Certificates, Legal Documents, etc.

3. **Professional Plan + Professional User Type:**
   - Free access to EVERYTHING
   - No payment required for any service
   - Can manage multiple clients

4. **Business Owner + Professional Plan:**
   - Gets all features access
   - Still pays for premium services (because userType !== "professional")

---

## 📞 Support

If you need to understand access for a specific user or service, check:
1. User's `userType` in Firestore (`users/{userId}`)
2. User's `subscriptionPlan` in Firestore (`users/{userId}`)
3. Service base price in `on-demand-pricing.ts`
4. Pricing logic in `service-pricing-utils.ts`













