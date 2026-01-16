/**
 * ITR Notification Service
 * Handles sending email and WhatsApp notifications for ITR filing events
 */

import { createITRNotification, getITRApplication } from './firestore';
import type { ITRNotification, ITRStatus } from './types';

export interface NotificationData {
  userId: string;
  applicationId: string;
  type: ITRNotification['type'];
  financialYear?: string;
  acknowledgementNumber?: string;
  refundAmount?: number;
  [key: string]: any;
}

/**
 * Send notification via email and WhatsApp
 */
export async function sendITRNotification(data: NotificationData): Promise<void> {
  try {
    // Create in-app notification first
    const application = data.applicationId ? await getITRApplication(data.applicationId) : null;
    
    const { title, message } = getNotificationContent(data.type, {
      financialYear: data.financialYear || application?.financialYear,
      acknowledgementNumber: data.acknowledgementNumber || application?.filingInfo?.acknowledgementNumber,
      refundAmount: data.refundAmount || application?.refundInfo?.amount,
    });

    // Create notification record
    const notificationId = await createITRNotification({
      userId: data.userId,
      applicationId: data.applicationId,
      type: data.type,
      title,
      message,
      emailSent: false,
      whatsappSent: false,
      inAppRead: false,
      createdAt: new Date(),
    });

    // Send email notification
    try {
      await sendEmailNotification(data.userId, title, message, data.applicationId);
      
      // Update notification record
      const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await updateDoc(doc(db, 'itrNotifications', notificationId), {
        emailSent: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
      // Don't fail the whole process if email fails
    }

    // Send WhatsApp notification
    try {
      const userPhone = await getUserPhone(data.userId);
      if (userPhone) {
        await sendWhatsAppNotification(userPhone, message);
        
        // Update notification record
        const { updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        await updateDoc(doc(db, 'itrNotifications', notificationId), {
          whatsappSent: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to send WhatsApp notification:', error);
      // Don't fail the whole process if WhatsApp fails
    }
  } catch (error) {
    console.error('Failed to send ITR notification:', error);
    throw error;
  }
}

/**
 * Get notification title and message based on type
 */
function getNotificationContent(
  type: ITRNotification['type'],
  context: {
    financialYear?: string;
    acknowledgementNumber?: string;
    refundAmount?: number;
  }
): { title: string; message: string } {
  const fy = context.financialYear || '';
  
  switch (type) {
    case 'DRAFT_READY':
      return {
        title: 'ITR Draft Ready for Review',
        message: `Your ITR draft for Financial Year ${fy} is ready for review. Please log in to review and approve the draft.`,
      };
    
    case 'FILING_STARTED':
      return {
        title: 'ITR Filing Started',
        message: `Your ITR filing for FY ${fy} has been initiated by our CA team. We'll keep you updated on the progress.`,
      };
    
    case 'FILING_COMPLETED':
      return {
        title: 'ITR Filing Completed',
        message: `Great news! Your ITR for FY ${fy} has been successfully filed. Acknowledgement Number: ${context.acknowledgementNumber || 'N/A'}`,
      };
    
    case 'REFUND_UPDATE':
      const refundMsg = context.refundAmount
        ? `Your refund of ₹${context.refundAmount.toLocaleString()} has been processed.`
        : 'Your refund status has been updated.';
      return {
        title: 'Refund Status Update',
        message: `${refundMsg} Please check your account or login to view details.`,
      };
    
    case 'CHANGES_REQUESTED':
      return {
        title: 'Changes Requested on ITR Draft',
        message: `You have requested changes to your ITR draft for FY ${fy}. Our CA team will review and update the draft shortly.`,
      };
    
    case 'STATUS_UPDATE':
      return {
        title: 'ITR Status Updated',
        message: `Your ITR application status for FY ${fy} has been updated. Please log in to view the latest status.`,
      };
    
    default:
      return {
        title: 'ITR Update',
        message: `There's an update on your ITR application for FY ${fy}. Please log in to view details.`,
      };
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(
  userId: string,
  subject: string,
  body: string,
  applicationId?: string
): Promise<void> {
  try {
    // Get user email from Firestore
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      console.warn(`User ${userId} not found for email notification`);
      return;
    }
    
    const userData = userDoc.data();
    const userEmail = userData.email;
    
    if (!userEmail) {
      console.warn(`No email found for user ${userId}`);
      return;
    }

    // Send email via API (server-side)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const response = await fetch(`${appUrl}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [userEmail],
        subject,
        body: `${body}\n\nView your ITR application: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/itr-filing${applicationId ? `/${applicationId}` : ''}`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }
  } catch (error) {
    console.error('Email notification error:', error);
    throw error;
  }
}

/**
 * Send WhatsApp notification
 */
async function sendWhatsAppNotification(phoneNumber: string, message: string): Promise<void> {
  try {
    // Format phone number (remove +, spaces, etc.)
    const formattedPhone = phoneNumber.replace(/[^\d]/g, '');
    
    // Send via WhatsApp API endpoint (server-side)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    const response = await fetch(`${appUrl}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: formattedPhone,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send WhatsApp message');
    }
  } catch (error) {
    console.error('WhatsApp notification error:', error);
    throw error;
  }
}

/**
 * Get user phone number from Firestore
 */
async function getUserPhone(userId: string): Promise<string | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data();
    return userData.phone || userData.phoneNumber || null;
  } catch (error) {
    console.error('Error getting user phone:', error);
    return null;
  }
}

