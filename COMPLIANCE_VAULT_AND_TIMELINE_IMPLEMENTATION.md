# Document Vault Integration & Compliance Timeline Dashboard

## Overview

This document describes the implementation of:
1. **Document Vault Compliance Integration** - Linking documents to compliance tasks with metadata
2. **Compliance Timeline Dashboard** - Client-facing UI for compliance health visualization

---

## 1. Document Vault Integration

### Purpose

Extend the Document Vault to support compliance task linking, filing status tracking, and compliance metadata.

### Implementation

**Location:** `src/lib/compliance-lifecycle/vault/document-vault-service.ts`

### Key Functions

#### `updateDocumentComplianceMetadata()`
Updates a document with compliance-related metadata:
- `complianceType` - Type of compliance (GST, Income Tax, TDS, etc.)
- `linkedTaskId` - ID of the compliance task this document is linked to
- `linkedRuleId` - ID of the compliance rule
- `filingReference` - Reference number from filing portal
- `filingStatus` - Current status: `uploaded` → `under_review` → `approved` → `filed` → `archived`
- `filingPeriod` - Period the document relates to (e.g., "2024-04")
- `filingYear` - Financial year (e.g., "2024-25")
- `portalSubmissionId` - Submission ID from government portal

```typescript
import { updateDocumentComplianceMetadata } from '@/lib/compliance-lifecycle';

await updateDocumentComplianceMetadata(documentId, {
  complianceType: 'gst',
  linkedTaskId: taskId,
  filingStatus: 'under_review',
  filingPeriod: '2024-04',
}, userId, firmId);
```

#### `linkDocumentToComplianceTask()`
Links a document to a specific compliance task:

```typescript
import { linkDocumentToComplianceTask } from '@/lib/compliance-lifecycle';

await linkDocumentToComplianceTask(documentId, taskId, 'gst', userId, firmId);
```

#### `updateDocumentFilingStatus()`
Updates the filing status of a document (used when filing is completed):

```typescript
import { updateDocumentFilingStatus } from '@/lib/compliance-lifecycle';

await updateDocumentFilingStatus(documentId, 'filed', {
  filingReference: 'GST-2024-04-123456',
  filingPeriod: '2024-04',
  portalSubmissionId: 'SUBM-12345',
}, userId, firmId);
```

#### Query Functions
- `getDocumentsByTaskId()` - Get all documents linked to a task
- `getDocumentsByComplianceType()` - Get documents by compliance type
- `getDocumentsByFilingStatus()` - Get documents by filing status

### Document Metadata Structure

When a document is linked to a compliance task, the metadata is extended:

```typescript
{
  // Existing vault fields
  fileName: string;
  category: string;
  userId: string;
  // ... other existing fields
  
  // Compliance extensions
  metadata: {
    description?: string;
    documentDate?: Date;
    tags?: string[];
    
    // Compliance metadata (new)
    complianceType?: 'gst' | 'income_tax' | 'tds' | ...;
    linkedTaskId?: string;
    linkedRuleId?: string;
    filingReference?: string;
    filingStatus?: 'uploaded' | 'under_review' | 'approved' | 'filed' | 'rejected' | 'archived';
    filingPeriod?: string;
    filingYear?: string;
    portalSubmissionId?: string;
    lastReviewedAt?: Date;
    reviewedBy?: string; // Associate code
  }
}
```

### Integration Points

#### When Document is Uploaded for Compliance Task

1. Document uploaded via Vault UI
2. User selects "Link to Compliance Task" option (optional)
3. Task ID provided (from compliance task context)
4. Document metadata automatically updated with compliance fields
5. Task's `requiredDocuments` array updated to mark document as uploaded

#### Automatic Linking

When a document is uploaded from a compliance task context (future enhancement):
- Task ID automatically passed to upload dialog
- Document automatically linked on upload
- No manual intervention needed

### Document Lifecycle States

```
uploaded → under_review → approved → filed → archived
                              ↓
                           rejected
```

---

## 2. Compliance Timeline Dashboard

### Purpose

Client-facing dashboard showing compliance health, upcoming deadlines, risks, and completed filings.

**Location:** `src/app/(app)/compliance/timeline/page.tsx`

### Features

#### Health Status Indicator
- **Green**: All tasks on track, no risks
- **Amber**: Some upcoming deadlines or minor risks
- **Red**: Overdue tasks or critical risks

#### Statistics Overview
- **Total Tasks**: All compliance tasks
- **Completed**: Successfully filed tasks
- **Upcoming**: Tasks due in next 30 days
- **Active Risks**: Number of compliance risks

#### Sections

1. **Active Risks**
   - Shows compliance risks requiring attention
   - Displays severity (Low, Medium, High, Critical)
   - Shows recommended actions

2. **Overdue Tasks**
   - Tasks past their due date
   - Shows days overdue
   - Highlighted in red

3. **Upcoming Deadlines**
   - Tasks due in next 30 days
   - Shows days remaining
   - Sorted by due date

4. **Recently Completed**
   - Tasks completed/filed in last 30 days
   - Shows completion date
   - Displays acknowledgment numbers when available

### UI Design Principles

- **Outcome-Focused**: Shows results (filed, overdue) not process details
- **Clear Status Indicators**: Color-coded badges and health status
- **Actionable Information**: Clear deadlines and risk descriptions
- **Professional Anonymity**: All tasks labeled "Handled by ZenithBooks Compliance Team"

### Usage

Access the timeline dashboard at: `/compliance/timeline`

```typescript
// Navigation link
<Link href="/compliance/timeline">View Compliance Timeline</Link>
```

### Data Loading

The dashboard loads:
- All compliance tasks for the user
- Active compliance risks
- Calculates statistics and health status

### Empty States

- **No Tasks**: Shows message with link to compliance plans
- **No Risks**: Risk section hidden when no active risks
- **All Clear**: Shows positive message when all tasks completed

---

## Integration with Existing Systems

### Compliance Task Orchestrator

When documents are uploaded and linked:
1. Task's `requiredDocuments` array updated
2. Document marked as `uploaded: true`
3. Audit log created

### Risk Engine

The timeline dashboard displays risks detected by the Compliance Risk Engine:
- GSTR mismatches
- ITC shortfalls
- Delayed filings
- Missing documents

### Audit Service

All document linking and status updates are logged:
- `document_uploaded` - When document linked to task
- `document_reviewed` - When filing status updated

---

## Future Enhancements

### Document Upload Dialog Enhancement
- Optional dropdown to select compliance task during upload
- Auto-populate compliance type from selected task
- Visual indicators for required documents per task

### Timeline Enhancements
- Calendar view of deadlines
- Export compliance report
- Email reminders for upcoming deadlines
- Filter by compliance type

### Document Workflow
- Auto-transition status on filing completion
- Bulk document linking
- Document versioning with compliance context

---

## API Usage Examples

### Link Document to Task After Upload

```typescript
import { linkDocumentToComplianceTask } from '@/lib/compliance-lifecycle';

// After document upload
const documentId = 'doc_123';
const taskId = 'task_456';

await linkDocumentToComplianceTask(
  documentId,
  taskId,
  'gst',
  userId,
  firmId
);
```

### Update Document Filing Status

```typescript
import { updateDocumentFilingStatus } from '@/lib/compliance-lifecycle';

// After filing is completed
await updateDocumentFilingStatus(
  documentId,
  'filed',
  {
    filingReference: 'GST-2024-04-123456',
    filingPeriod: '2024-04',
    portalSubmissionId: 'SUBM-12345',
  },
  userId,
  firmId
);
```

### Query Compliance Documents

```typescript
import { 
  getDocumentsByTaskId,
  getDocumentsByComplianceType,
  getDocumentsByFilingStatus
} from '@/lib/compliance-lifecycle';

// Get all documents for a task
const taskDocs = await getDocumentsByTaskId(taskId);

// Get all GST documents
const gstDocs = await getDocumentsByComplianceType(userId, 'gst');

// Get all filed documents
const filedDocs = await getDocumentsByFilingStatus(userId, 'filed');
```

---

## Summary

Both features are now **fully implemented**:

✅ **Document Vault Integration**
- Compliance metadata extension
- Task linking functionality
- Filing status tracking
- Query functions for compliance documents

✅ **Compliance Timeline Dashboard**
- Health status visualization
- Statistics overview
- Risk alerts
- Upcoming deadlines
- Completed tasks tracking
- Client-facing, outcome-focused UI

Both features integrate seamlessly with the existing Compliance Lifecycle Automation system and maintain ICAI compliance standards.

