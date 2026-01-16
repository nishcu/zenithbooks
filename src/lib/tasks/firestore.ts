/**
 * Task Assignment System - Firestore Service
 * Isolated module - new collections only
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

// Verify db is available
if (!db) {
  console.error('Firestore db is not initialized. Check Firebase configuration.');
}
import type {
  TaskPost,
  TaskApplication,
  TaskChat,
  TaskReview,
} from '../professionals/types';

const COLLECTIONS = {
  TASKS_POSTS: 'tasks_posts',
  TASKS_APPLICATIONS: 'tasks_applications',
  TASKS_CHATS: 'tasks_chats',
  TASKS_REVIEWS: 'tasks_reviews',
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
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (filters?.limitCount) {
    q = query(q, limit(filters.limitCount));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      deadline: data.deadline?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as TaskPost;
  });
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

// ==================== Task Applications ====================

/**
 * Apply for a task
 */
export async function applyForTask(
  applicationData: Omit<TaskApplication, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<string> {
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
 * Get applications for a task
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
 * Get applications by applicant
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
 * Update application status
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
 * Subscribe to realtime applications for a task
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

// ==================== Task Chats ====================

/**
 * Send a chat message
 */
export async function sendTaskChatMessage(
  chatData: Omit<TaskChat, 'id' | 'createdAt'>
): Promise<string> {
  const chatsRef = collection(db, COLLECTIONS.TASKS_CHATS);
  const docRef = await addDoc(chatsRef, {
    ...chatData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get chat messages for a task
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
 * Subscribe to realtime chat messages
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

// ==================== Task Reviews ====================

/**
 * Create a review
 */
export async function createTaskReview(
  reviewData: Omit<TaskReview, 'id' | 'createdAt'>
): Promise<string> {
  const reviewsRef = collection(db, COLLECTIONS.TASKS_REVIEWS);
  const docRef = await addDoc(reviewsRef, {
    ...reviewData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get reviews for a professional
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
 * Get reviews for a task
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

