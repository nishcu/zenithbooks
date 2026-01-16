# Vercel Cron Job Setup for ITR Credential Cleanup

## Overview

The credential auto-deletion cron job runs daily to clean up ITR credentials that have exceeded the retention period (90 days after completion).

## Setup Instructions

### Option 1: Vercel Cron (Recommended)

1. **Create `vercel.json` in project root** (if not exists):

```json
{
  "crons": [
    {
      "path": "/api/itr/cleanup-credentials",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule:** `0 2 * * *` = Daily at 2:00 AM UTC

### Option 2: Manual Trigger (Testing/Development)

You can manually trigger the cleanup via API:

```bash
# Using curl
curl -X GET http://localhost:3000/api/itr/cleanup-credentials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Or POST
curl -X POST http://localhost:3000/api/itr/cleanup-credentials \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 3: External Cron Service

Use services like:
- **EasyCron**
- **Cron-Job.org**
- **UptimeRobot**

Set up to call: `https://your-domain.com/api/itr/cleanup-credentials` with Authorization header.

## Environment Variables

Add to Vercel environment variables:

```env
CRON_SECRET=your-secret-key-here
```

**For Vercel Cron:**
- Vercel automatically adds an `Authorization` header
- You can also use the `CRON_SECRET` for manual triggers

## Security

The endpoint requires authorization:
- Development: Allows direct calls
- Production: Requires `Authorization: Bearer {CRON_SECRET}` header

## What It Does

1. Fetches all ITR credentials
2. Checks application status:
   - If COMPLETED and >90 days old → Delete
   - If REJECTED and >90 days old → Delete
   - If application doesn't exist → Delete
3. Logs deletion in application metadata
4. Returns summary of deletions

## Response Format

```json
{
  "success": true,
  "timestamp": "2024-01-15T02:00:00.000Z",
  "retentionPeriodDays": 90,
  "results": {
    "checked": 150,
    "deleted": 12,
    "errors": 0,
    "details": [...]
  }
}
```

## Monitoring

Check Vercel function logs or set up alerts for:
- High error rates
- Unexpected deletion counts
- Failed executions

