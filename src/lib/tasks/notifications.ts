/**
 * Task/Collaboration Request Notification Service
 * Handles notifications for task creation, invitations, and updates
 */

import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
 * Create a notification for a user
 */
async function createNotification(data: NotificationData): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      ...data,
      read: data.read ?? false,
      createdAt: serverTimestamp(),
      expiresAt: data.expiresAt ? Timestamp.fromDate(data.expiresAt) : null,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Get user ID from firm ID
 * In this system, firmId might be the userId itself or stored in user document
 */
async function getUserIdsFromFirmIds(firmIds: string[]): Promise<string[]> {
  const userIds: string[] = [];
  
  for (const firmId of firmIds) {
    try {
      // First, check if firmId is a userId (direct match)
      const userDoc = await getDoc(doc(db, "users", firmId));
      if (userDoc.exists()) {
        userIds.push(firmId);
      } else {
        // If not, search for users with this firmId
        const usersQuery = query(
          collection(db, "users"),
          where("firmId", "==", firmId)
        );
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach((userDoc) => {
          userIds.push(userDoc.id);
        });
      }
    } catch (error) {
      console.error(`Error fetching user for firmId ${firmId}:`, error);
    }
  }
  
  return [...new Set(userIds)]; // Remove duplicates
}

/**
 * Notify invited firms about a new collaboration request
 */
export async function notifyTaskInvitation(
  taskId: string,
  taskTitle: string,
  requestedByFirmName: string,
  invitedFirmIds: string[]
): Promise<void> {
  if (invitedFirmIds.length === 0) {
    return; // No one to notify
  }

  try {
    // Get user IDs for all invited firms
    const userIds = await getUserIdsFromFirmIds(invitedFirmIds);

    // Create notifications for each user
    const notificationPromises = userIds.map((userId) =>
      createNotification({
        userId,
        type: "info",
        title: "New Collaboration Request",
        message: `${requestedByFirmName} has invited you to collaborate on: "${taskTitle}"`,
        actionUrl: `/tasks/view/${taskId}`,
        actionLabel: "View Request",
      })
    );

    await Promise.all(notificationPromises);
    console.log(`Sent ${userIds.length} notifications for task ${taskId}`);
  } catch (error) {
    console.error("Error notifying invited firms:", error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Notify all professionals in the network about a new firm-network task
 */
export async function notifyFirmNetworkTask(
  taskId: string,
  taskTitle: string,
  requestedByFirmName: string,
  category: string
): Promise<void> {
  try {
    // Get all professional user IDs
    // We'll get users with userType === 'professional'
    const usersQuery = query(
      collection(db, "users"),
      where("userType", "==", "professional")
    );
    
    const usersSnapshot = await getDocs(usersQuery);
    const userIds: string[] = [];
    
    usersSnapshot.forEach((doc) => {
      userIds.push(doc.id);
    });

    if (userIds.length === 0) {
      return; // No professionals to notify
    }

    // Create notifications for each professional
    const notificationPromises = userIds.map((userId) =>
      createNotification({
        userId,
        type: "info",
        title: "New Collaboration Request in Network",
        message: `${requestedByFirmName} posted a new ${category} request: "${taskTitle}"`,
        actionUrl: `/tasks/view/${taskId}`,
        actionLabel: "View Request",
      })
    );

    await Promise.all(notificationPromises);
    console.log(`Sent ${userIds.length} notifications for firm-network task ${taskId}`);
  } catch (error) {
    console.error("Error notifying firm network:", error);
    // Don't throw - notifications are not critical
  }
}

/**
 * Notify task creator about application/response
 */
export async function notifyTaskApplication(
  taskId: string,
  taskTitle: string,
  applicantFirmName: string,
  taskCreatorUserId: string
): Promise<void> {
  try {
    await createNotification({
      userId: taskCreatorUserId,
      type: "info",
      title: "New Application",
      message: `${applicantFirmName} has applied to your collaboration request: "${taskTitle}"`,
      actionUrl: `/tasks/view/${taskId}`,
      actionLabel: "View Applications",
    });
  } catch (error) {
    console.error("Error notifying task creator:", error);
  }
}

