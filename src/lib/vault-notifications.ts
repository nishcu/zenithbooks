/**
 * Vault Notification Utilities
 * Helper functions for creating vault-related notifications
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { VAULT_SHARE_CODE } from "@/lib/vault-constants";

interface NotificationData {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'compliance' | 'appointment' | 'system';
  title: string;
  message: string;
  read?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt?: any;
  expiresAt?: Date;
}

/**
 * Check if notification type is enabled in user preferences
 */
async function isNotificationEnabled(
  userId: string,
  type: "accessAlerts" | "expiryWarnings" | "storageWarnings"
): Promise<boolean> {
  try {
    const settingsRef = doc(db, "vaultSettings", userId);
    const settingsDoc = await getDoc(settingsRef);
    
    if (!settingsDoc.exists()) {
      return true; // Default to enabled
    }
    
    const preferences = settingsDoc.data().notificationPreferences || {};
    return preferences[type] ?? true; // Default to enabled if not set
  } catch (error) {
    console.error("Error checking notification preferences:", error);
    return true; // Default to enabled on error
  }
}

/**
 * Create a notification for the document owner
 */
export async function createVaultNotification(data: NotificationData): Promise<void> {
  try {
    // Check if notification should be created based on preferences
    let shouldNotify = true;
    
    if (data.type === "info" && data.title === "Document Accessed") {
      shouldNotify = await isNotificationEnabled(data.userId, "accessAlerts");
    } else if (data.type === "warning" && (data.title.includes("Expiring") || data.title.includes("Expired"))) {
      shouldNotify = await isNotificationEnabled(data.userId, "expiryWarnings");
    } else if (data.type === "warning" || data.type === "error") {
      if (data.title === "Storage Warning") {
        shouldNotify = await isNotificationEnabled(data.userId, "storageWarnings");
      }
    }
    
    if (!shouldNotify) {
      return; // Don't create notification if disabled
    }
    
    await addDoc(collection(db, "notifications"), {
      ...data,
      read: data.read ?? false,
      createdAt: serverTimestamp(),
      expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
    });
  } catch (error) {
    console.error("Error creating vault notification:", error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Create notification when document is accessed
 */
export async function notifyDocumentAccess(
  userId: string,
  documentName: string,
  shareCodeName: string,
  action: "view" | "download"
): Promise<void> {
  await createVaultNotification({
    userId,
    type: "info",
    title: "Document Accessed",
    message: `${documentName} was ${action === "download" ? "downloaded" : "viewed"} via share code "${shareCodeName}".`,
    actionUrl: "/vault/logs",
    actionLabel: "View Logs",
  });
}

/**
 * Create notification when share code is about to expire (1 day before)
 */
export async function notifyShareCodeExpiring(
  userId: string,
  codeName: string,
  expiresAt: Date
): Promise<void> {
  await createVaultNotification({
    userId,
    type: "warning",
    title: "Share Code Expiring Soon",
    message: `Share code "${codeName}" will expire in 1 day. Consider creating a new code if needed.`,
    actionUrl: "/vault/sharing",
    actionLabel: "Manage Codes",
  });
}

/**
 * Create notification when share code expires
 */
export async function notifyShareCodeExpired(
  userId: string,
  codeName: string
): Promise<void> {
  await createVaultNotification({
    userId,
    type: "warning",
    title: "Share Code Expired",
    message: `Share code "${codeName}" has expired. Third parties can no longer access documents using this code.`,
    actionUrl: "/vault/sharing",
    actionLabel: "Manage Codes",
  });
}

/**
 * Create notification for storage warnings
 */
export async function notifyStorageWarning(
  userId: string,
  storageUsed: number,
  storageLimit: number,
  percentage: number
): Promise<void> {
  let message = "";
  let type: "warning" | "error" = "warning";

  if (percentage >= 95) {
    message = `Storage is ${percentage.toFixed(1)}% full. Please free up space immediately.`;
    type = "error";
  } else if (percentage >= 90) {
    message = `Storage is ${percentage.toFixed(1)}% full. Consider deleting unused documents.`;
    type = "error";
  } else if (percentage >= 80) {
    message = `Storage is ${percentage.toFixed(1)}% full. Consider reviewing your documents.`;
    type = "warning";
  }

  if (message) {
    await createVaultNotification({
      userId,
      type,
      title: "Storage Warning",
      message,
      actionUrl: "/vault",
      actionLabel: "Manage Storage",
    });
  }
}

/**
 * Check and create expiry warnings for share codes
 * This should be called periodically (e.g., via a cron job or scheduled function)
 */
export async function checkAndNotifyExpiringCodes(userId: string): Promise<void> {
  try {
    const codesRef = collection(db, "vaultShareCodes");
    const q = query(
      codesRef,
      where("userId", "==", userId),
      where("isActive", "==", true)
    );

    const snapshot = await getDocs(q);
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    snapshot.docs.forEach((doc) => {
      const codeData = doc.data();
      const expiresAt = codeData.expiresAt?.toDate 
        ? codeData.expiresAt.toDate() 
        : new Date(codeData.expiresAt);

      // Check if expires within 24 hours
      if (expiresAt > now && expiresAt <= oneDayFromNow) {
        // Check if we already notified (to avoid spam)
        // For now, we'll create notification - in production, check notification history
        notifyShareCodeExpiring(userId, codeData.codeName, expiresAt);
      }

      // Check if expired
      if (expiresAt < now && codeData.isActive) {
        // Mark as inactive and notify
        // Note: In production, this should be done via a background job
        notifyShareCodeExpired(userId, codeData.codeName);
      }
    });
  } catch (error) {
    console.error("Error checking expiring codes:", error);
  }
}

