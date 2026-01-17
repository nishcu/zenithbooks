/**
 * Business Registration Notifications
 * ICAI-Compliant: All notifications sent from ZenithBooks, no professional exposure
 */

import { sendEmail } from '@/lib/email-utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { BusinessRegistration, RegistrationStatus } from './types';
import { getRegistrationConfig } from './constants';

/**
 * Send notification when registration status changes
 */
export async function notifyRegistrationStatusChange(
  registration: BusinessRegistration,
  oldStatus: RegistrationStatus,
  newStatus: RegistrationStatus
): Promise<void> {
  try {
    // Get user email from Firestore
    const userRef = doc(db, 'users', registration.userId);
    const userSnap = await getDoc(userRef);
    const userEmail = userSnap.exists() ? userSnap.data()?.email : null;
    
    if (!userEmail) {
      console.warn('User email not found for notification:', registration.userId);
      return;
    }

    const config = getRegistrationConfig(registration.registrationType);
    
    const statusMessages: Record<RegistrationStatus, { subject: string; body: string }> = {
      pending_documents: {
        subject: `Business Registration Request Received - ${config.name} - ZenithBooks`,
        body: `Your request for ${config.name} has been received.\n\nPlease upload the required documents to proceed:\n${config.requiredDocuments.map(doc => `- ${doc}`).join('\n')}\n\nThis registration will be handled by ZenithBooks Compliance Team.`,
      },
      submitted_to_team: {
        subject: `Documents Submitted - ${config.name} - ZenithBooks`,
        body: `Thank you for submitting the required documents for ${config.name}.\n\nYour application has been submitted to ZenithBooks Compliance Team for processing. You will receive updates as your registration progresses.`,
      },
      in_progress: {
        subject: `Registration In Progress - ${config.name} - ZenithBooks`,
        body: `Your ${config.name} application is now being processed by ZenithBooks Compliance Team.\n\nEstimated completion: ${config.estimatedDays} business days\n\nYou will receive an update once the registration is completed.`,
      },
      under_review: {
        subject: `Registration Under Review - ${config.name} - ZenithBooks`,
        body: `Your ${config.name} application is under review by our internal professional team.\n\nThis review ensures compliance with all applicable regulations. You will be notified once the review is complete.`,
      },
      completed: {
        subject: `Registration Completed - ${config.name} - ZenithBooks`,
        body: `Congratulations! Your ${config.name} has been successfully completed.\n\n${registration.registrationNumber ? `Registration Number: ${registration.registrationNumber}\n\n` : ''}Your registration certificate is available in your dashboard. All documents have been stored in your secure vault.\n\nThis registration was handled by ZenithBooks Compliance Team in compliance with applicable Indian laws and professional regulations.`,
      },
      rejected: {
        subject: `Registration Update - ${config.name} - ZenithBooks`,
        body: `Your ${config.name} application requires additional information.\n\n${registration.rejectionReason ? `Reason: ${registration.rejectionReason}\n\n` : ''}Please review the requirements and resubmit. Our Compliance Team will assist you with the necessary corrections.`,
      },
      on_hold: {
        subject: `Registration On Hold - ${config.name} - ZenithBooks`,
        body: `Your ${config.name} application is temporarily on hold.\n\n${registration.internalNotes ? `Notes: ${registration.internalNotes}\n\n` : ''}Our Compliance Team will reach out to resolve any pending issues. You will receive an update once processing resumes.`,
      },
    };

    const message = statusMessages[newStatus];
    
    if (message) {
      await sendEmail({
        to: userEmail,
        subject: message.subject,
        body: `${message.body}\n\n---\nAll registration tasks are handled by ZenithBooks Compliance Team in compliance with Indian laws and ICAI regulations.\n\nZenithBooks Business Registration Services`,
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Send notification when documents are uploaded
 */
export async function notifyDocumentsUploaded(
  registration: BusinessRegistration,
  documentsCount: number
): Promise<void> {
  try {
    const userRef = doc(db, 'users', registration.userId);
    const userSnap = await getDoc(userRef);
    const userEmail = userSnap.exists() ? userSnap.data()?.email : null;
    
    if (!userEmail) return;

    const config = getRegistrationConfig(registration.registrationType);
    
    await sendEmail({
      to: userEmail,
      subject: `Documents Received - ${config.name} - ZenithBooks`,
      body: `We have received ${documentsCount} document(s) for your ${config.name} application.\n\nOur Compliance Team will review the documents and process your registration. You will receive an update once the review is complete.\n\n---\nAll registration tasks are handled by ZenithBooks Compliance Team in compliance with Indian laws and ICAI regulations.\n\nZenithBooks Business Registration Services`,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

