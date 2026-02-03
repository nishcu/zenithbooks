/**
 * Compliance Task Notifications
 * ICAI-Compliant: All notifications sent from ZenithBooks, no professional exposure
 */

import { sendEmail } from '@/lib/email-utils';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ComplianceTaskExecution } from './types';

/**
 * Send notification when task status changes
 */
export async function notifyTaskStatusChange(
  task: ComplianceTaskExecution,
  oldStatus: ComplianceTaskExecution['status'],
  newStatus: ComplianceTaskExecution['status']
): Promise<void> {
  try {
    // Get user email from Firestore
    const userRef = doc(db, 'users', task.userId);
    const userSnap = await getDoc(userRef);
    const userEmail = userSnap.exists() ? userSnap.data()?.email : null;
    
    if (!userEmail) {
      console.warn('User email not found for notification:', task.userId);
      return;
    }

    const statusMessages: Record<string, { subject: string; body: string }> = {
      pending: {
        subject: 'Compliance Task Created - ZenithBooks',
        body: `A new compliance task "${task.taskName}" has been created for your account. It will be handled by ZenithBooks Compliance Team.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}`,
      },
      assigned: {
        subject: 'Compliance Task Assigned - ZenithBooks',
        body: `Your compliance task "${task.taskName}" has been assigned to our team. It will be handled by ZenithBooks Compliance Team.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}`,
      },
      in_progress: {
        subject: 'Compliance Task In Progress - ZenithBooks',
        body: `Your compliance task "${task.taskName}" is now being processed by ZenithBooks Compliance Team.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}\n\nYou will receive an update once the task is completed.`,
      },
      submitted: {
        subject: 'Compliance Task Submitted for Review - ZenithBooks',
        body: `Your compliance task "${task.taskName}" has been submitted for internal review. ZenithBooks Compliance Team will complete the process.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}`,
      },
      review_required: {
        subject: 'Compliance Task Under Review - ZenithBooks',
        body: `Your compliance task "${task.taskName}" is under quality review. It will be handled by ZenithBooks Compliance Team.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}`,
      },
      approved: {
        subject: 'Compliance Task Approved - ZenithBooks',
        body: `Your compliance task "${task.taskName}" has been approved by our team. It will be completed by ZenithBooks Compliance Team.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}`,
      },
      rework: {
        subject: 'Compliance Task Update - ZenithBooks',
        body: `Your compliance task "${task.taskName}" is being refined by our team. ZenithBooks Compliance Team will complete it shortly.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}`,
      },
      completed: {
        subject: 'Compliance Task Completed - ZenithBooks',
        body: `Your compliance task "${task.taskName}" has been completed by ZenithBooks Compliance Team.\n\nCompleted Date: ${task.completedAt instanceof Date ? task.completedAt.toLocaleDateString() : new Date(task.completedAt || Date.now()).toLocaleDateString()}\n\nPlease check your dashboard for details.`,
      },
      filed: {
        subject: 'Compliance Filing Completed - ZenithBooks',
        body: `Your compliance filing "${task.taskName}" has been successfully filed by ZenithBooks Compliance Team.\n\n${task.filingDetails ? `Form: ${task.filingDetails.formType}\nPeriod: ${task.filingDetails.period}\n${task.filingDetails.acknowledgmentNumber ? `Acknowledgment Number: ${task.filingDetails.acknowledgmentNumber}` : ''}` : ''}\n\nPlease check your dashboard for the filed documents in your vault.`,
      },
      closed: {
        subject: 'Compliance Task Closed - ZenithBooks',
        body: `Your compliance task "${task.taskName}" has been closed by ZenithBooks Compliance Team.\n\nPlease check your dashboard for details.`,
      },
      failed: {
        subject: 'Compliance Task Update Required - ZenithBooks',
        body: `There was an issue processing your compliance task "${task.taskName}". Our Compliance Team will reach out to resolve this.\n\nDue Date: ${task.dueDate instanceof Date ? task.dueDate.toLocaleDateString() : new Date(task.dueDate).toLocaleDateString()}\n\nPlease check your dashboard or contact support for assistance.`,
      },
    };

    const message = statusMessages[newStatus] ?? statusMessages.completed;
    
    if (message) {
      await sendEmail({
        to: userEmail,
        subject: message.subject,
        body: `${message.body}\n\n---\nThis task is handled by ZenithBooks Compliance Team.\nAll professional services are delivered in accordance with applicable Indian laws and professional regulations.\n\nZenithBooks Compliance Services`,
      });
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Send notification when task is assigned to Compliance Associate
 */
export async function notifyTaskAssignment(
  task: ComplianceTaskExecution,
  associateCode: string
): Promise<void> {
  // Internal notification - can be logged or sent to internal system
  console.log('Task assigned to Compliance Associate:', {
    taskId: task.id,
    taskName: task.taskName,
    associateCode,
    clientCode: task.firmId.substring(0, 8),
    dueDate: task.dueDate,
  });
  
  // In production, this could send email/Slack notification to the associate
  // But do NOT send to client - ICAI compliance
}

/**
 * Send notification when task is due soon (7 days before)
 */
export async function notifyTaskDueSoon(task: ComplianceTaskExecution): Promise<void> {
  try {
    const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue > 7 || task.status === 'completed' || task.status === 'filed') {
      return; // Only notify if due within 7 days
    }

    // Get user email
    const userRef = doc(db, 'users', task.userId);
    const userSnap = await getDoc(userRef);
    const userEmail = userSnap.exists() ? userSnap.data()?.email : null;
    
    if (!userEmail) return;

    await sendEmail({
      to: userEmail,
      subject: `Compliance Task Due Soon - ${daysUntilDue} Days - ZenithBooks`,
      body: `This is a reminder that your compliance task "${task.taskName}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}.\n\nDue Date: ${dueDate.toLocaleDateString()}\n\nThis task is being handled by ZenithBooks Compliance Team. You will receive a notification once it's completed.\n\n---\nZenithBooks Compliance Services`,
    });
  } catch (error) {
    console.error('Error sending due soon notification:', error);
  }
}

