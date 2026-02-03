   # Compliance Associate – Total Feature Explanation

   This document explains **every feature** of the Compliance Associate program in ZenithBooks: what it is, who it’s for, how to join, what associates do, how they’re managed, and how it fits with the rest of the product.

   ---

   ## 1. What Is Compliance Associate?

   **Compliance Associate** is a **program for young CAs, accountants, CS, CMA, graduates, and students** to **join ZenithBooks and earn** by doing compliance work for ZenithBooks’ clients. It is **not a subscription plan** for clients; it is a **join-and-earn** opportunity for professionals.

   - **Purpose:** Let qualified people (CA students, junior CAs, accountants, etc.) work on real GST, TDS, payroll, MCA, and related compliance for ZenithBooks clients and get paid.
   - **Model:** Associates are **internal resources** of ZenithBooks. Clients never see associate names or contact them; they only see “Handled by ZenithBooks Compliance Team” (ICAI-compliant).
   - **Join:** Register → Pay annual platform fee → Admin approves → Get an Associate Code → Start receiving tasks and earning.

   ---

   ## 2. Who It’s For (Target Audience)

   - **Young CAs** (including CA students)
   - **Accountants** (B.Com, M.Com, etc.)
   - **CS / CMA** (students or qualified)
   - **Graduates** in commerce/law
   - **Students** with relevant background who want to **earn while they learn**

   ---

   ## 3. Why Join? (Benefits – JOIN / EARN / ETC.)

   | Benefit | Explanation |
   |--------|-------------|
   | **Earn** | Get paid for handling GST, Income Tax, TDS, Payroll, and MCA compliance for ZenithBooks clients. |
   | **Flexible hours** | Work on your own schedule while gaining experience. |
   | **Learn & grow** | Hands-on experience on real cases; build expertise in compliance. |
   | **Build profile** | Strengthen your professional profile and career in accounting/compliance. |
   | **Work with experts** | Collaborate with experienced professionals and learn from them. |
   | **Recognition** | Get recognized for your work and build a strong professional reputation. |

   These are reflected on the **Compliance Associate** marketing page (`/compliance-associate`).

   ---

   ## 4. What Associates Do (Tasks)

   Associates typically handle:

   - **GST** – Filing and compliance (e.g. GSTR-1, GSTR-3B).
   - **Income Tax & TDS** – Returns and TDS filings.
   - **Payroll** – Processing and PF/ESI compliance.
   - **MCA** – Company/LLP compliance and filings.
   - **Other** – As per specializations (e.g. incorporation, audit, bookkeeping).

   They work on **real client cases** with **expert guidance** from ZenithBooks. All work is done under the ZenithBooks brand; clients do not see the associate’s name or code.

   ---

   ## 5. How to Join (User Flow)

   There are **two entry points** in the app:

   ### 5.1 Marketing / Info Page: `/compliance-associate`

   - **Content:** Hero, “Why join?”, benefits, “What you’ll do,” and an **inline application form** (name, email, phone, qualification, experience, current role, availability, “Why join?”).
   - **Behavior:** Submitting the form currently shows a success message but **does not** save to Firestore (TODO in code). For actual registration, users should use the full flow below.

   ### 5.2 Full Registration Flow: `/compliance-associates/apply`

   This is the **real join path**:

   1. **Login required**  
      - Not logged in → redirect to `/login?redirect=/compliance-associates/apply`.

   2. **Already registered?**  
      - If the user’s email already has an associate registration, they are redirected to dashboard with a message showing their associate code and status.

   3. **Step 1 – Application form**  
      - **Personal:** Name, email (from account), phone, PAN.  
      - **Professional:** Qualification (CA, CS, CMA, Graduate, Other), years of experience, **at least one specialization** (GST, TDS, Payroll, Incorporation, MCA, ITR, Audit, Bookkeeping).  
      - **Bank (for payouts):** Account number, IFSC, bank name, account holder name.  
      - User is informed about the **annual platform fee** (₹999) before continuing.

   4. **Step 2 – Platform fee payment**  
      - **Amount:** ₹999 per year (from `PLATFORM_FEE_ANNUAL`).  
      - **Payment:** Cashfree checkout.  
      - **After success:** Registration is “under review”; user is redirected to dashboard.  
      - Payment webhook marks `platformFee.paymentStatus = 'paid'` and sets `expiresAt` (1 year).

   5. **Admin approval**  
      - Admin approves or rejects in `/admin/compliance-associates`.  
      - **Only after payment:** Associate can be approved.  
      - On approval, status becomes `active` and the associate can receive tasks (via their **Associate Code**).

   6. **Associate Code**  
      - Auto-generated at registration (e.g. `AS-<timestamp>-<random>`).  
      - Used by admin to assign tasks; associates are identified by this code in the system.

   **Navigation:**

   - App nav: “Become Compliance Associate” → `/compliance-associates/apply` (for business, professional, super_admin).
   - Landing: “Join as Compliance Associate” → `/compliance-associate` (info + inline form).

   ---

   ## 6. Data Stored (Associate Profile)

   Each associate is stored in Firestore (`compliance_associates`) with:

   - **Identity:** name, email, phone, PAN, associate code.  
   - **Professional:** qualification, otherQualification (if Other), yearsOfExperience, specializations[].  
   - **Bank:** accountNumber, ifscCode, bankName, accountHolderName (for payouts).  
   - **Platform fee:** annualCharge (999), paymentStatus (pending | paid | expired | refunded), paymentId, orderId, paidAt, expiresAt, autoRenew.  
   - **Status:** pending_approval | active | suspended | inactive | rejected; approvedBy, approvedAt, rejectionReason.  
   - **Activity:** tasksCompleted, tasksInProgress; optional totalEarnings, rating.  
   - **Timestamps:** createdAt, updatedAt.

   Associate **audit logs** (e.g. registered, payment_received, approved, rejected, suspended, reactivated) are stored in `associate_audit_logs`.

   ---

   ## 7. Admin Features (Compliance Associates Management)

   **Page:** `/admin/compliance-associates` (linked from admin dashboard).

   **Capabilities:**

   - **List all associates** with status badges (pending_approval, active, suspended, inactive, rejected).
   - **Search/filter:** by name, email, associate code, PAN; filter by status.
   - **View details:** Full profile, bank details, specializations, payment status, tasks completed/in progress.
   - **Approve:** For `pending_approval` and payment = paid → set status to `active`.
   - **Reject:** Require rejection reason; set status to `rejected`.
   - **Update status:** For non-pending associates, change status to active / suspended / inactive / rejected (with optional reason for reject/suspend).

   **Displayed per associate:**

   - Associate code, email, qualification, experience.  
   - Platform fee payment status (pending / paid).  
   - Tasks completed and in progress.

   ---

   ## 8. How Associates Work After Approval (Task Assignment)

   - **No separate associate login.** Associates work through the **admin** side (or admin acts on their behalf).
   - **Task assignment:** Admin goes to **Compliance Tasks** (or Business Registrations), opens a task, and sets **“Assigned To”** to the associate’s **code** (e.g. AS-xxx).
   - **Execution:** Status is updated (e.g. pending → in_progress → completed / filed); internal notes and SOP references can be added.
   - **Client view:** Client only sees “Handled by ZenithBooks Compliance Team” and task status; **no** associate name or code (ICAI-compliant).
   - **Task list:** Admin can use **Associate Code** to search/filter tasks. Active associates are available in the compliance-tasks module (e.g. for dropdown/selection if implemented).

   Details are in `HOW_COMPLIANCE_ASSOCIATES_WORK.md` and `COMPLIANCE_ASSOCIATES_EXPLANATION.md`.

   ---

   ## 9. Platform Fee and Payment

   - **Amount:** ₹999 per year (`PLATFORM_FEE_ANNUAL` in `src/lib/compliance-associates/constants.ts`).
   - **When:** Paid at registration (Step 2 of `/compliance-associates/apply`).
   - **Gateway:** Cashfree (same as other ZenithBooks payments).
   - **Flow:**  
   - Order is created with `paymentType: 'associate_registration'` and `associateId` in tags.  
   - Webhook (`/api/payment/webhook`) on success calls `updateAssociatePaymentStatus(associateId, paymentId, orderId)`, which sets `platformFee.paymentStatus = 'paid'`, stores payment/order IDs, sets `paidAt` and `expiresAt` (current date + 1 year).
   - **Approval:** Admin can approve only when `platformFee.paymentStatus === 'paid'`.

   ---

   ## 10. Security and Rules (Firestore)

   - **compliance_associates:**  
   - Users can create their own registration (e.g. for their email).  
   - Users can read their own registration.  
   - Admins can read and update all registrations (for approval, status, etc.).
   - **associate_audit_logs:** Used for compliance and tracking; access aligned with admin/associate management.

   (Exact rules are in `firestore.rules` for these collections.)

   ---

   ## 11. Qualifications and Specializations (Options in UI)

   **Qualifications (dropdown):**  
   CA, CS, CMA, Graduate, Other (with free-text “other” if selected).

   **Specializations (multi-select, at least one required):**  
   GST Filing & Compliance, TDS Returns, Payroll Processing, Company/LLP Incorporation, MCA Compliances, Income Tax Returns, Statutory Audit, Bookkeeping & Accounting.

   Defined in `src/lib/compliance-associates/constants.ts`.

   ---

   ## 12. Two Pages Summary

   | Page | URL | Purpose |
   |------|-----|--------|
   | **Compliance Associate (info)** | `/compliance-associate` | Marketing: “Join and earn,” benefits, “What you’ll do,” inline form (currently no Firestore save). |
   | **Apply (full registration)** | `/compliance-associates/apply` | Full registration form → Firestore → platform fee (₹999) → admin approval → Associate Code. |

   For a **complete feature explanation**, the **full flow** is: **Apply** → **Pay** → **Admin approves** → **Receive tasks by Associate Code** → **Earn** (and learn, build profile, etc.). The **Compliance Associate** page is the “JOIN / EARN / ETC.” story; the **Apply** page is where joining is actually completed.

   ---

   ## 13. Quick Reference

   - **Join (user):** Login → `/compliance-associates/apply` → Fill form → Pay ₹999 → Wait for approval → Use Associate Code for tasks (via admin).
   - **Manage (admin):** `/admin/compliance-associates` → Search/filter → View → Approve/Reject/Update status.
   - **Assign work (admin):** Compliance Tasks (or Business Registrations) → Assign task to Associate Code (e.g. AS-xxx).
   - **Client:** Only sees “Handled by ZenithBooks Compliance Team”; no associate identity (ICAI-compliant).

   This is the **total feature explanation** of the Compliance Associate program in ZenithBooks.
