# Zenith Corporate Mitra Program – Knowledge Transfer (KT) Document

This document is a **detailed Knowledge Transfer (KT)** for staff on the **Zenith Corporate Mitra** program in ZenithBooks. Use it for onboarding, handover, and day-to-day operations.

---

## 1. What Is Zenith Corporate Mitra?

**Zenith Corporate Mitra** (formerly “Compliance Associate”) is an **internal platform-defined role** for professionals who join ZenithBooks to **earn by doing compliance work** for ZenithBooks’ clients. It is **not** a government-authorized designation.

- **Purpose:** Qualified people (young CAs, accountants, CS, CMA, graduates, students) work on real GST, TDS, payroll, MCA, and MSME-related compliance for ZenithBooks clients and get paid.
- **Model:** Mitras are **internal resources**. Clients **never** see Mitra name, code, or level—only “Handled by ZenithBooks Compliance Team” (ICAI-compliant).
- **Join flow:** Register → Pay annual platform fee (₹999) → Admin approves → Get Associate Code → Start receiving tasks and earning.

**Important disclaimer (shown to Mitras):**  
*“Zenith Corporate Mitra is an internal platform-defined role and not a government-authorized designation.”*

---

## 2. Target Audience (Who Can Join)

- Young CAs (including CA students)
- Accountants (B.Com, M.Com, etc.)
- CS / CMA (students or qualified)
- Commerce/law graduates
- Students with relevant background who want to earn while learning

---

## 3. Key Concepts

### 3.1 Associate Code

- **Format:** `AS-<timestamp>-<random>` (e.g. `AS-123456-042`).
- **Use:** Admin assigns tasks by **Associate Code**. Mitras are identified by this code in the system; clients never see it.
- **Where shown:** Mitra dashboard (`/corporate-mitra/dashboard`), admin list (`/admin/compliance-associates`).

### 3.2 Levels (CM-L1 to CM-L4)

| Level   | Meaning              | How achieved |
|--------|----------------------|--------------|
| **CM-L1** | Entry level          | Default for new approvals. |
| **CM-L2** | Mid level            | Auto: **30+ tasks** and **score ≥ 65**. |
| **CM-L3** | Senior / reviewer    | Auto: **100+ tasks** and **score ≥ 80**. Can act as QA reviewer. |
| **CM-L4** | Lead / expert        | **Admin only** (manual promotion). |

- **Auto level-up:** Logic in `src/lib/compliance-associates/performance.ts` (`evaluateLevelUpgrade`). CM-L4 is never set by the system.
- **Constants:** `LEVEL_UP_CONDITIONS` in `src/lib/compliance-associates/constants.ts`.

### 3.3 Performance Score (0–100)

- **Formula (simplified):**  
  `accuracyRate×0.4 + turnaroundScore×0.3 + (100−reworkPenalty)×0.2 + experienceBonus×0.1`
- **Inputs:** Accuracy rate, average turnaround hours, rework count, years of experience, tasks completed.
- **Recalculation:** `recalculateAndUpdatePerformance(associateId)` updates `performance` and `riskFlag` and writes to `corporate_mitra_audit_logs`.
- **Risk flag (internal only):**
  - **low:** score ≥ 75  
  - **medium:** 50 ≤ score &lt; 75  
  - **high:** score &lt; 50  

### 3.4 Certifications (Task Gating)

Mitras must have the **required certification** to be **eligible** for a task type. Admin dropdown for “Assigned To” shows only **eligible** Mitras; others are hidden or show “Certification required”.

| Certification   | Typical task types |
|-----------------|--------------------|
| **gstBasics**   | GST filing, GSTR-1, GSTR-3B, GST reconciliation |
| **msmeCompliance** | MSME registration, status check, TReDS onboarding prep, loan readiness report, govt scheme eligibility, basic MIS |
| **payrollBasics**  | Payroll processing, PF/ESI, payroll reports |
| **mcaBasics**   | MCA compliance tracking, annual ROC filings, event-based MCA, director KYC |

- **Defaults:** New associates have all certifications `false`; admin can update after training/assessment.
- **Mapping:** `TASK_CERTIFICATION_MAP` in `src/lib/compliance-associates/constants.ts`.  
- **Eligibility:** `getEligibleAssociatesForTask(taskId)` in `src/lib/compliance-associates/firestore.ts`.

### 3.5 MSME Enablement Task Types (Non-filing)

These are **non-filing** task types for CM-L1/CM-L2 Mitras:

- `MSME_REGISTRATION`
- `MSME_STATUS_CHECK`
- `TReDS_ONBOARDING_PREP`
- `LOAN_READINESS_REPORT`
- `GOVT_SCHEME_ELIGIBILITY`
- `BASIC_MIS_REPORT`

Defined in `MSME_TASK_TYPE_IDS` in `src/lib/compliance-associates/constants.ts`.

---

## 4. Task Lifecycle (Including QA)

### 4.1 Status Flow

Recommended flow for tasks that use QA:

```
pending → assigned → in_progress → submitted → review_required → approved OR rework
                                                                      ↓
                                                            (if rework → back to in_progress)
                                                                      ↓
                                                            filed → closed
```

**All statuses (for reference):**

- `pending`, `assigned`, `in_progress`, `submitted`, `review_required`, `approved`, `rework`, `completed`, `filed`, `closed`, `failed`

### 4.2 QA Workflow

- **When QA is required:** Task execution has `qa.required = true`. Such tasks **must** go through review before being closed/filed.
- **Reviewer:** Must be **CM-L3 or CM-L4** (stored as `qa.reviewerLevelRequired`).
- **QA fields on task execution:**  
  `qa.required`, `qa.reviewerAssociateId`, `qa.reviewerLevelRequired`, `qa.reviewStatus` (`pending` | `approved` | `rework`), `qa.reviewNotes`, `qa.reviewedAt`.
- **Rework:** When status is set to `rework`, the system **increments** the assigned Mitra’s `performance.reworkCount` (in `compliance_associates`). This affects their performance score.
- **Implementation:** Status updates in `src/lib/compliance-plans/firestore.ts` (`updateTaskExecutionStatus`). Admin UI: `/admin/compliance-tasks` (QA section and status dropdown).

---

## 5. Data Model (Firestore)

### 5.1 Collection: `compliance_associates`

**Key fields:**

- **Identity:** `name`, `email`, `phone`, `panNumber`, `associateCode`
- **Professional:** `qualification`, `otherQualification`, `yearsOfExperience`, `specializations[]`
- **Bank (payouts):** `bankAccount` (accountNumber, ifscCode, bankName, accountHolderName)
- **Platform fee:** `platformFee` (annualCharge, paymentStatus, paymentId, orderId, paidAt, expiresAt, autoRenew)
- **Status:** `status` (pending_approval | active | suspended | inactive | rejected), `approvedBy`, `approvedAt`, `rejectionReason`
- **Activity:** `tasksCompleted`, `tasksInProgress`, `totalEarnings`, `rating`
- **Corporate Mitra:**  
  `level` (CM-L1..CM-L4), `performance` (score, accuracyRate, avgTurnaroundHours, reworkCount, lastEvaluatedAt),  
  `certifications` (gstBasics, msmeCompliance, payrollBasics, mcaBasics),  
  `eligibleTaskTypes[]`, `riskFlag` (low | medium | high)
- **Timestamps:** `createdAt`, `updatedAt`

**Rules (summary):** User can read own doc (by email), create own; only admin/super_admin can update all. Exact rules in `firestore.rules` under `compliance_associates`.

### 5.2 Collection: `compliance_task_executions`

- **Assignment:** `assignedTo` = Associate Code (string). `assignedToInternalTeam = true` (ICAI).
- **QA:** `qa` object as above.
- **Status:** Uses full list including `review_required`, `approved`, `rework`, etc.

### 5.3 Collection: `corporate_mitra_audit_logs`

- **Purpose:** Audit trail for Mitra-related actions.
- **Actions:** `level_up`, `score_update`, `certification_passed`, `task_reviewed`.
- **Fields:** `associateId`, `associateCode`, `action`, `meta`, `createdAt`.
- **Rules:** Read by admin or by the Mitra (own associateId via email match); create by authenticated; update/delete admin/super_admin only.

### 5.4 Collection: `associate_audit_logs`

- **Purpose:** Registration/payment/approval lifecycle.
- **Actions:** e.g. `registered`, `payment_received`, `approved`, `rejected`, `suspended`, `reactivated,` `fee_renewed`.

---

## 6. User Flows

### 6.1 Mitra (Candidate) – How to Join

1. **Info page:** `/compliance-associate` – marketing, benefits, inline form (may not persist to Firestore; for actual registration use below).
2. **Full registration:** `/compliance-associates/apply` (login required).
   - Step 1: Application form (personal, professional, bank). Shown: annual platform fee ₹999.
   - Step 2: Pay ₹999 (Cashfree). On success → status “under review”.
   - Admin approves in `/admin/compliance-associates` (only when payment = paid).
   - On approval: status → `active`, Mitra gets Associate Code and can receive tasks.

**Navigation:**  
- App nav: “Become Compliance Associate” / “Zenith Corporate Mitra” → `/compliance-associates/apply`.  
- Landing: “Join as Compliance Associate” → `/compliance-associate`.

### 6.2 Mitra (Approved) – Dashboard

- **URL:** `/corporate-mitra/dashboard`
- **Who:** Logged-in user whose email matches an approved associate.
- **Content (read-only):** Associate code, level, tasks summary, earnings summary, performance score, certifications, next-level eligibility checklist, and the **disclaimer** that Corporate Mitra is an internal platform role, not a government designation.

### 6.3 Admin – Managing Mitras

- **URL:** `/admin/compliance-associates`
- **Actions:** List, search/filter (name, email, code, status), view full profile, **approve** (only if payment = paid), **reject** (with reason), update status (active/suspended/inactive/rejected).
- **Optional:** Update level (e.g. promote to CM-L4), update certifications, trigger performance recalc (if exposed in UI or via backend).

### 6.4 Admin – Assigning Tasks and QA

- **URL:** `/admin/compliance-tasks` (and any task list that assigns to Mitra)
- **Assignment:** “Assigned To” dropdown shows only **eligible** Mitras (certification gating). If a task type requires e.g. `gstBasics`, only Mitras with `certifications.gstBasics === true` appear.
- **Status:** Set status along the flow (assigned → in_progress → submitted → review_required → approved/rework → filed → closed).
- **QA:** For tasks with `qa.required = true`, set reviewer (CM-L3/CM-L4), `reviewStatus` (approved/rework), and `reviewNotes` as needed.

---

## 7. Platform Fee and Payment

- **Amount:** ₹999 per year (`PLATFORM_FEE_ANNUAL` in `src/lib/compliance-associates/constants.ts`).
- **When:** Step 2 of `/compliance-associates/apply` (Cashfree).
- **Webhook:** On success, `/api/payment/webhook` calls `updateAssociatePaymentStatus(associateId, paymentId, orderId)` → `platformFee.paymentStatus = 'paid'`, `expiresAt` = now + 1 year.
- **Approval:** Admin can approve **only** when `platformFee.paymentStatus === 'paid'`.

---

## 8. Security and Firestore Rules (Summary)

- **compliance_associates:** Read own (by email), create own; update only admin/super_admin.
- **associate_audit_logs:** Read by admin or own (associateId → email match); create authenticated; update/delete admin/super_admin.
- **corporate_mitra_audit_logs:** Read by admin or own (associateId → email match); create authenticated; update/delete admin/super_admin.

Clients **never** get associate identity (name, code, level)—enforced by UI and data access; only “ZenithBooks Compliance Team” is shown (ICAI compliance).

---

## 9. Code and File Reference

| Area | Location |
|------|----------|
| Constants (levels, certifications, task–cert map, MSME task IDs) | `src/lib/compliance-associates/constants.ts` |
| Types (ComplianceAssociate, level, performance, certifications, audit log) | `src/lib/compliance-associates/types.ts` |
| Firestore (CRUD, eligibility, performance/level/cert updates, audit logs) | `src/lib/compliance-associates/firestore.ts` |
| Performance scoring and level-up logic | `src/lib/compliance-associates/performance.ts` |
| Task execution status and QA (including rework → reworkCount) | `src/lib/compliance-plans/firestore.ts` |
| Task/QA types | `src/lib/compliance-plans/types.ts` |
| Admin – Mitras | `src/app/(app)/admin/compliance-associates/` |
| Admin – Compliance tasks (assign, QA, status) | `src/app/(app)/admin/compliance-tasks/page.tsx` |
| Mitra dashboard | `src/app/(app)/corporate-mitra/dashboard/page.tsx` |
| Apply flow | `src/app/(app)/compliance-associates/apply/` |
| Info/marketing page | `src/app/(app)/compliance-associate/` |
| Firestore rules | `firestore.rules` (compliance_associates, associate_audit_logs, corporate_mitra_audit_logs) |

---

## 10. Quick Reference for Staff

| Role | Action | Where |
|------|--------|--------|
| **Candidate** | Join and pay | `/compliance-associates/apply` |
| **Mitra** | View code, level, performance, tasks | `/corporate-mitra/dashboard` |
| **Admin** | Approve/reject Mitras, update status/level/certs | `/admin/compliance-associates` |
| **Admin** | Assign tasks (only eligible Mitras by certification) | `/admin/compliance-tasks` (Assigned To) |
| **Admin** | Run QA (review, approve/rework) for tasks with `qa.required` | Same page, QA section; reviewer CM-L3/CM-L4 |
| **Client** | Sees only “Handled by ZenithBooks Compliance Team” | Everywhere; no Mitra identity |

---

## 11. Common Issues and Troubleshooting

- **“Missing or insufficient permissions” on associate/task/audit:** Check Firestore rules and that the user has the right role (admin for bulk updates; Mitra only for own data by email).
- **Associate not in “Assigned To” dropdown:** Ensure they are **active**, have **required certification** for that task type, and (if applicable) level meets reviewer requirement for QA.
- **Level not auto-upgrading:** Level-up runs via `evaluateLevelUpgrade(associateId)` (e.g. after task completion or admin trigger). CM-L2 needs 30+ tasks and score ≥ 65; CM-L3 needs 100+ tasks and score ≥ 80. CM-L4 is **manual** only.
- **Performance score not updating:** Use `recalculateAndUpdatePerformance(associateId)`; it updates `performance`, `riskFlag`, and writes to `corporate_mitra_audit_logs`.
- **Rework not reflecting:** When status is set to `rework`, `updateTaskExecutionStatus` increments the **assigned** Mitra’s `reworkCount`; ensure `assignedTo` is set to the Associate Code.
- **Firestore “Unsupported field value: undefined”:** Do not write `undefined` to Firestore. Omit the field or use a default (e.g. for optional fields like `otherQualification`).

---

This KT document covers the **entire Zenith Corporate Mitra program** as implemented: joining, levels, performance, certifications, task and QA workflow, data model, security, and key code locations. Use it for training and handover to your staff.
