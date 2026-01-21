/**
 * Professional Collaboration System - Firestore Service
 * ICAI-Compliant: Firm-to-firm collaboration only
 * Uses new collection names with backward compatibility for legacy collections
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
// Ensure Firebase is initialized before using db
import { db } from '@/lib/firebase';

// Verify db is available and initialized
if (!db) {
  console.error('Firestore db is not initialized. Check Firebase configuration.');
  throw new Error('Firestore database is not initialized. Please check Firebase configuration.');
}
import type {
  TaskPost,
  CollaborationRequest,
  TaskApplication,
  CollaborationInvite,
  TaskChat,
  CollaborationChat,
  TaskReview,
  InternalQualityFeedback,
} from '../professionals/types';

const COLLECTIONS = {
  COLLABORATION_REQUESTS: 'collaboration_requests', // Renamed from tasks_posts
  TASKS_POSTS: 'tasks_posts', // Legacy alias for backward compatibility
  COLLABORATION_INVITES: 'collaboration_invites', // Renamed from tasks_applications
  TASKS_APPLICATIONS: 'tasks_applications', // Legacy alias for backward compatibility
  COLLABORATION_CHATS: 'collaboration_chats', // Renamed from tasks_chats
  TASKS_CHATS: 'tasks_chats', // Legacy alias for backward compatibility
  INTERNAL_QUALITY_FEEDBACK: 'internal_quality_feedback', // Renamed from tasks_reviews
  TASKS_REVIEWS: 'tasks_reviews', // Legacy alias for backward compatibility
};

// ==================== Task Posts ====================

/**
 * Create a new task post
 */
export async function createTaskPost(
  taskData: Omit<TaskPost, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const tasksRef = collection(db, COLLECTIONS.TASKS_POSTS);
  const docRef = await addDoc(tasksRef, {
    ...taskData,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get task post by ID
 */
export async function getTaskPost(taskId: string): Promise<TaskPost | null> {
  const taskRef = doc(db, COLLECTIONS.TASKS_POSTS, taskId);
  const taskSnap = await getDoc(taskRef);
  
  if (!taskSnap.exists()) {
    return null;
  }
  
  const data = taskSnap.data();
  return {
    id: taskSnap.id,
    ...data,
    deadline: data.deadline?.toDate() || new Date(),
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as TaskPost;
}

/**
 * List all tasks with optional filters
 */
export async function listTasks(filters?: {
  status?: TaskPost['status'];
  category?: string;
  state?: string;
  city?: string;
  postedBy?: string;
  assignedTo?: string;
  limitCount?: number;
}): Promise<TaskPost[]> {
  let q = query(collection(db, COLLECTIONS.TASKS_POSTS));
  
  // Apply filters
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  } else {
    // Default: show open tasks
    q = query(q, where('status', '==', 'open'));
  }
  
  if (filters?.category) {
    q = query(q, where('category', '==', filters.category));
  }
  
  if (filters?.state) {
    q = query(q, where('state', '==', filters.state));
  }
  
  if (filters?.city) {
    q = query(q, where('city', '==', filters.city));
  }
  
  if (filters?.postedBy) {
    q = query(q, where('postedBy', '==', filters.postedBy));
  }
  
  if (filters?.assignedTo) {
    q = query(q, where('assignedTo', '==', filters.assignedTo));
  }
  
  // Order by createdAt (newest first)
  // Note: This requires a composite index if used with where clauses
  // If index is missing, we'll sort client-side as fallback
  try {
    q = query(q, orderBy('createdAt', 'desc'));
    
    if (filters?.limitCount) {
      q = query(q, limit(filters.limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      try {
        const data = doc.data();
        // Safely convert Firestore Timestamps to Dates
        const convertTimestamp = (ts: any): Date => {
          if (!ts) return new Date();
          if (ts instanceof Date) return ts;
          if (ts?.toDate && typeof ts.toDate === 'function') return ts.toDate();
          if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
          return new Date();
        };
        
        return {
          id: doc.id,
          ...data,
          deadline: convertTimestamp(data.deadline),
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
        } as TaskPost;
      } catch (error) {
        console.error('Error converting task document:', error, doc.id);
        // Return a minimal valid task object
        return {
          id: doc.id,
          ...doc.data(),
          deadline: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        } as TaskPost;
      }
    });
  } catch (error: any) {
    // If composite index is missing, try without orderBy and sort client-side
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('Composite index missing, sorting client-side:', error.message);
      
      // Remove orderBy and limit, fetch all and sort client-side
      let fallbackQuery = query(collection(db, COLLECTIONS.TASKS_POSTS));
      
      // Re-apply all where clauses
      if (filters?.status) {
        fallbackQuery = query(fallbackQuery, where('status', '==', filters.status));
      } else {
        fallbackQuery = query(fallbackQuery, where('status', '==', 'open'));
      }
      
      if (filters?.category) {
        fallbackQuery = query(fallbackQuery, where('category', '==', filters.category));
      }
      
      if (filters?.state) {
        fallbackQuery = query(fallbackQuery, where('state', '==', filters.state));
      }
      
      if (filters?.city) {
        fallbackQuery = query(fallbackQuery, where('city', '==', filters.city));
      }
      
      if (filters?.postedBy) {
        fallbackQuery = query(fallbackQuery, where('postedBy', '==', filters.postedBy));
      }
      
      if (filters?.assignedTo) {
        fallbackQuery = query(fallbackQuery, where('assignedTo', '==', filters.assignedTo));
      }
      
      const snapshot = await getDocs(fallbackQuery);
      let tasks = snapshot.docs.map((doc) => {
        try {
          const data = doc.data();
          // Safely convert Firestore Timestamps to Dates
          const convertTimestamp = (ts: any): Date => {
            if (!ts) return new Date();
            if (ts instanceof Date) return ts;
            if (ts?.toDate && typeof ts.toDate === 'function') return ts.toDate();
            if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
            return new Date();
          };
          
          return {
            id: doc.id,
            ...data,
            deadline: convertTimestamp(data.deadline),
            createdAt: convertTimestamp(data.createdAt),
            updatedAt: convertTimestamp(data.updatedAt),
          } as TaskPost;
        } catch (error) {
          console.error('Error converting task document:', error, doc.id);
          // Return a minimal valid task object
          return {
            id: doc.id,
            ...doc.data(),
            deadline: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          } as TaskPost;
        }
      });
      
      // Sort client-side by createdAt (newest first)
      tasks.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return dateB - dateA;
      });
      
      // Apply limit client-side if needed
      if (filters?.limitCount) {
        tasks = tasks.slice(0, filters.limitCount);
      }
      
      return tasks;
    }
    
    // Re-throw if it's a different error
    throw error;
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskPost['status'],
  assignedTo?: string,
  assignedToName?: string
): Promise<void> {
  const taskRef = doc(db, COLLECTIONS.TASKS_POSTS, taskId);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  if (assignedTo) {
    updateData.assignedTo = assignedTo;
    updateData.assignedToName = assignedToName;
  }
  
  await updateDoc(taskRef, updateData);
}

/**
 * Subscribe to realtime task updates
 */
export function subscribeToTasks(
  filters: {
    status?: TaskPost['status'];
    category?: string;
    state?: string;
    city?: string;
  },
  callback: (tasks: TaskPost[]) => void
): Unsubscribe {
  let q = query(collection(db, COLLECTIONS.TASKS_POSTS));
  
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  } else {
    q = query(q, where('status', '==', 'open'));
  }
  
  if (filters.category) {
    q = query(q, where('category', '==', filters.category));
  }
  
  if (filters.state) {
    q = query(q, where('state', '==', filters.state));
  }
  
  if (filters.city) {
    q = query(q, where('city', '==', filters.city));
  }
  
  q = query(q, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        deadline: data.deadline?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as TaskPost;
    });
    callback(tasks);
  });
}

// ==================== Collaboration Invites ====================

/**
 * Create collaboration invite (invitation-only system)
 */
export async function createCollaborationInvite(
  inviteData: Omit<CollaborationInvite, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  const invitesRef = collection(db, COLLECTIONS.COLLABORATION_INVITES);
  const docRef = await addDoc(invitesRef, {
    ...inviteData,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Apply for a task (LEGACY - for backward compatibility)
 * @deprecated Use createCollaborationInvite instead
 */
export async function applyForTask(
  applicationData: Omit<TaskApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
  // Use legacy collection for backward compatibility
  const applicationsRef = collection(db, COLLECTIONS.TASKS_APPLICATIONS);
  const docRef = await addDoc(applicationsRef, {
    ...applicationData,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get collaboration invites for a request
 */
export async function getCollaborationInvites(requestId: string): Promise<CollaborationInvite[]> {
  // Try new collection first
  let q = query(
    collection(db, COLLECTIONS.COLLABORATION_INVITES),
    where('requestId', '==', requestId),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        respondedAt: data.respondedAt?.toDate() || undefined,
      } as CollaborationInvite;
    });
  } catch (error) {
    // Fallback to legacy collection
    return getTaskApplications(requestId);
  }
}

/**
 * Get applications for a task (LEGACY - for backward compatibility)
 * @deprecated Use getCollaborationInvites instead
 */
export async function getTaskApplications(taskId: string): Promise<TaskApplication[]> {
  const q = query(
    collection(db, COLLECTIONS.TASKS_APPLICATIONS),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as TaskApplication;
  });
}

/**
 * Get collaboration invites by invited firm
 */
export async function getInvitesByFirm(invitedFirmId: string): Promise<CollaborationInvite[]> {
  // Try new collection first
  let q = query(
    collection(db, COLLECTIONS.COLLABORATION_INVITES),
    where('invitedFirmId', '==', invitedFirmId),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        respondedAt: data.respondedAt?.toDate() || undefined,
      } as CollaborationInvite;
    });
  } catch (error) {
    // Fallback to legacy
    return [];
  }
}

/**
 * Get applications by applicant (LEGACY - for backward compatibility)
 * @deprecated Use getInvitesByFirm instead
 */
export async function getApplicationsByApplicant(applicantId: string): Promise<TaskApplication[]> {
  const q = query(
    collection(db, COLLECTIONS.TASKS_APPLICATIONS),
    where('applicantId', '==', applicantId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as TaskApplication;
  });
}

/**
 * Update collaboration invite status
 */
export async function updateCollaborationInviteStatus(
  inviteId: string,
  status: CollaborationInvite['status']
): Promise<void> {
  // Try new collection first
  try {
    const inviteRef = doc(db, COLLECTIONS.COLLABORATION_INVITES, inviteId);
    await updateDoc(inviteRef, {
      status,
      respondedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Fallback to legacy collection
    const appRef = doc(db, COLLECTIONS.TASKS_APPLICATIONS, inviteId);
    await updateDoc(appRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Update application status (LEGACY - for backward compatibility)
 * @deprecated Use updateCollaborationInviteStatus instead
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: TaskApplication['status']
): Promise<void> {
  const appRef = doc(db, COLLECTIONS.TASKS_APPLICATIONS, applicationId);
  await updateDoc(appRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Subscribe to realtime collaboration invites for a request
 */
export function subscribeToCollaborationInvites(
  requestId: string,
  callback: (invites: CollaborationInvite[]) => void
): Unsubscribe {
  // Try new collection first
  try {
    const q = query(
      collection(db, COLLECTIONS.COLLABORATION_INVITES),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const invites = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          respondedAt: data.respondedAt?.toDate() || undefined,
        } as CollaborationInvite;
      });
      callback(invites);
    });
  } catch (error) {
    // Fallback to legacy
    return subscribeToTaskApplications(requestId, callback as any);
  }
}

/**
 * Subscribe to realtime applications for a task (LEGACY - for backward compatibility)
 * @deprecated Use subscribeToCollaborationInvites instead
 */
export function subscribeToTaskApplications(
  taskId: string,
  callback: (applications: TaskApplication[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.TASKS_APPLICATIONS),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const applications = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as TaskApplication;
    });
    callback(applications);
  });
}

// ==================== Collaboration Chats ====================

/**
 * Send a collaboration chat message
 */
export async function sendCollaborationChatMessage(
  chatData: Omit<CollaborationChat, 'id' | 'createdAt'>
): Promise<string> {
  // Use new collection name
  const chatsRef = collection(db, COLLECTIONS.COLLABORATION_CHATS);
  const docRef = await addDoc(chatsRef, {
    ...chatData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Send a task chat message (LEGACY - for backward compatibility)
 * @deprecated Use sendCollaborationChatMessage instead
 */
export async function sendTaskChatMessage(
  chatData: Omit<TaskChat, 'id' | 'createdAt'>
): Promise<string> {
  // Fallback to legacy collection
  const chatsRef = collection(db, COLLECTIONS.TASKS_CHATS);
  const docRef = await addDoc(chatsRef, {
    ...chatData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get collaboration chat messages for a request
 */
export async function getCollaborationChatMessages(requestId: string): Promise<CollaborationChat[]> {
  // Try new collection first
  try {
    const q = query(
      collection(db, COLLECTIONS.COLLABORATION_CHATS),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as CollaborationChat;
    });
  } catch (error) {
    // Fallback to legacy
    return getTaskChatMessages(requestId);
  }
}

/**
 * Get chat messages for a task (LEGACY - for backward compatibility)
 * @deprecated Use getCollaborationChatMessages instead
 */
export async function getTaskChatMessages(taskId: string): Promise<TaskChat[]> {
  const q = query(
    collection(db, COLLECTIONS.TASKS_CHATS),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as TaskChat;
  });
}

/**
 * Subscribe to realtime collaboration chat messages
 */
export function subscribeToCollaborationChat(
  requestId: string,
  callback: (messages: CollaborationChat[]) => void
): Unsubscribe {
  // Try new collection first
  try {
    const q = query(
      collection(db, COLLECTIONS.COLLABORATION_CHATS),
      where('requestId', '==', requestId),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as CollaborationChat;
      });
      callback(messages);
    });
  } catch (error) {
    // Fallback to legacy
    return subscribeToTaskChat(requestId, callback as any);
  }
}

/**
 * Subscribe to realtime chat messages (LEGACY - for backward compatibility)
 * @deprecated Use subscribeToCollaborationChat instead
 */
export function subscribeToTaskChat(
  taskId: string,
  callback: (messages: TaskChat[]) => void
): Unsubscribe {
  const q = query(
    collection(db, COLLECTIONS.TASKS_CHATS),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as TaskChat;
    });
    callback(messages);
  });
}

// ==================== Internal Quality Feedback ====================

/**
 * Create internal quality feedback (ICAI-Compliant - private only)
 */
export async function createInternalQualityFeedback(
  feedbackData: Omit<InternalQualityFeedback, 'id' | 'createdAt'>
): Promise<string> {
  // Use new collection name
  const feedbackRef = collection(db, COLLECTIONS.INTERNAL_QUALITY_FEEDBACK);
  const docRef = await addDoc(feedbackRef, {
    ...feedbackData,
    visibility: 'private', // Always private for ICAI compliance
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Create a review (LEGACY - for backward compatibility)
 * @deprecated Use createInternalQualityFeedback instead
 */
export async function createTaskReview(
  reviewData: Omit<TaskReview, 'id' | 'createdAt'>
): Promise<string> {
  // Fallback to legacy collection
  const reviewsRef = collection(db, COLLECTIONS.TASKS_REVIEWS);
  const docRef = await addDoc(reviewsRef, {
    ...reviewData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get internal quality feedback for a firm (private only - never displayed publicly)
 */
export async function getInternalFeedbackForFirm(receivedByFirmId: string): Promise<InternalQualityFeedback[]> {
  // Internal feedback is private - only for requesting firm and admin
  const q = query(
    collection(db, COLLECTIONS.INTERNAL_QUALITY_FEEDBACK),
    where('receivedByFirmId', '==', receivedByFirmId),
    where('visibility', '==', 'private'),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as InternalQualityFeedback;
    });
  } catch (error) {
    // Fallback to legacy
    return [];
  }
}

/**
 * Get reviews for a professional (LEGACY - for backward compatibility)
 * @deprecated Use getInternalFeedbackForFirm instead - note: internal feedback is never displayed publicly
 */
export async function getProfessionalReviews(professionalId: string): Promise<TaskReview[]> {
  const q = query(
    collection(db, COLLECTIONS.TASKS_REVIEWS),
    where('professionalId', '==', professionalId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as TaskReview;
  });
}

/**
 * Get internal quality feedback for a request (private only)
 */
export async function getInternalFeedbackForRequest(requestId: string): Promise<InternalQualityFeedback[]> {
  // Internal feedback is private - only for requesting firm and admin
  const q = query(
    collection(db, COLLECTIONS.INTERNAL_QUALITY_FEEDBACK),
    where('requestId', '==', requestId),
    where('visibility', '==', 'private'),
    orderBy('createdAt', 'desc')
  );
  
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as InternalQualityFeedback;
    });
  } catch (error) {
    // Fallback to legacy
    return getTaskReviews(requestId);
  }
}

/**
 * Get reviews for a task (LEGACY - for backward compatibility)
 * @deprecated Use getInternalFeedbackForRequest instead
 */
export async function getTaskReviews(taskId: string): Promise<TaskReview[]> {
  const q = query(
    collection(db, COLLECTIONS.TASKS_REVIEWS),
    where('taskId', '==', taskId),
    orderBy('createdAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
    } as TaskReview;
  });
}

