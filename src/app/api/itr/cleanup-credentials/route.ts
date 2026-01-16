/**
 * Credential Auto-Deletion Cron Job
 * Deletes ITR credentials after filing completion or after retention period
 * 
 * Run this as a cron job (e.g., daily via Vercel Cron or external scheduler)
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getITRApplication } from '@/lib/itr/firestore';

// Runtime config
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Retention period: 90 days after completion
const CREDENTIAL_RETENTION_DAYS = 90;

/**
 * Check if cron job is authorized (via secret header)
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'change-me-in-production';
  
  // For Vercel Cron, use the Authorization header
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  
  // Allow direct calls in development (remove in production)
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = {
      checked: 0,
      deleted: 0,
      errors: 0,
      details: [] as Array<{ credentialId: string; applicationId: string; reason: string; error?: string }>,
    };

    // Get all ITR credentials
    const credentialsRef = collection(db, 'itrCredentials');
    const credentialsSnapshot = await getDocs(credentialsRef);

    const now = new Date();
    const retentionDate = new Date(now.getTime() - CREDENTIAL_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    // Process each credential
    for (const credDoc of credentialsSnapshot.docs) {
      try {
        results.checked++;
        const credData = credDoc.data();
        const applicationId = credData.applicationId;

        if (!applicationId) {
          continue;
        }

        // Get application to check status
        const application = await getITRApplication(applicationId);
        
        if (!application) {
          // Application doesn't exist, safe to delete credential
          await deleteDoc(doc(db, 'itrCredentials', credDoc.id));
          results.deleted++;
          results.details.push({
            credentialId: credDoc.id,
            applicationId,
            reason: 'Application not found',
          });
          continue;
        }

        // Check if application is completed
        if (application.status === 'COMPLETED' && application.completedAt) {
          const completedDate = application.completedAt instanceof Date 
            ? application.completedAt 
            : new Date(application.completedAt);

          // Check if retention period has passed
          if (completedDate < retentionDate) {
            // Delete credential
            await deleteDoc(doc(db, 'itrCredentials', credDoc.id));
            
            // Log deletion in application metadata (optional)
            try {
              const appRef = doc(db, 'itrApplications', applicationId);
              await updateDoc(appRef, {
                'metadata.credentialDeletedAt': serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            } catch (logError) {
              // Don't fail if logging fails
              console.error('Error logging credential deletion:', logError);
            }

            results.deleted++;
            results.details.push({
              credentialId: credDoc.id,
              applicationId,
              reason: `Retention period expired (completed: ${completedDate.toISOString()})`,
            });
            continue;
          }
        }

        // Check if application was rejected and retention period passed
        if (application.status === 'REJECTED' && application.createdAt) {
          const createdDate = application.createdAt instanceof Date 
            ? application.createdAt 
            : new Date(application.createdAt);

          if (createdDate < retentionDate) {
            await deleteDoc(doc(db, 'itrCredentials', credDoc.id));
            results.deleted++;
            results.details.push({
              credentialId: credDoc.id,
              applicationId,
              reason: `Rejected application retention period expired`,
            });
            continue;
          }
        }
      } catch (error: any) {
        results.errors++;
        results.details.push({
          credentialId: credDoc.id,
          applicationId: credDoc.data().applicationId || 'unknown',
          reason: 'Error processing',
          error: error.message,
        });
        console.error(`Error processing credential ${credDoc.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      retentionPeriodDays: CREDENTIAL_RETENTION_DAYS,
      results,
    });
  } catch (error: any) {
    console.error('Credential cleanup error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to cleanup credentials',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

