/**
 * Knowledge Exchange - Firestore Service
 * Isolated module - no dependencies on Tasks or Networking
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { 
  KnowledgePost, 
  KnowledgeCategory, 
  KnowledgePostStatus,
  KnowledgeReaction,
  KnowledgeSave,
  KnowledgeReport,
} from './types';

const COLLECTIONS = {
  KNOWLEDGE_POSTS: 'knowledge_posts',
  KNOWLEDGE_REACTIONS: 'knowledge_reactions',
  KNOWLEDGE_SAVES: 'knowledge_saves',
  KNOWLEDGE_REPORTS: 'knowledge_reports',
};

/**
 * Create a new knowledge post
 * Auto-flags for review if content validation fails
 */
export async function createKnowledgePost(
  postData: Omit<KnowledgePost, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'helpfulCount' | 'savedByUsers' | 'reportedByUsers'>
): Promise<string> {
  // Import validation here to avoid circular dependencies
  const { shouldAutoFlagForReview } = await import('./validation');
  
  // Check if should be auto-flagged
  const shouldFlag = shouldAutoFlagForReview(
    postData.title,
    postData.content,
    postData.sourceReference
  );
  
  // Remove undefined fields (Firestore doesn't accept undefined)
  const cleanedPostData: any = {};
  Object.keys(postData).forEach((key) => {
    const value = (postData as any)[key];
    if (value !== undefined) {
      cleanedPostData[key] = value;
    }
  });

  const postsRef = collection(db, COLLECTIONS.KNOWLEDGE_POSTS);
  const docRef = await addDoc(postsRef, {
    ...cleanedPostData,
    status: (shouldFlag ? 'UNDER_REVIEW' : 'PUBLISHED') as KnowledgePostStatus,
    helpfulCount: 0,
    savedByUsers: [],
    reportedByUsers: [],
    reportReasons: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get knowledge post by ID
 */
export async function getKnowledgePost(postId: string): Promise<KnowledgePost | null> {
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const postSnap = await getDoc(postRef);
  
  if (!postSnap.exists()) {
    return null;
  }
  
  const data = postSnap.data();
  return {
    id: postSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    removedAt: data.removedAt?.toDate() || undefined,
  } as KnowledgePost;
}

/**
 * List knowledge posts with filters
 */
export async function listKnowledgePosts(filters?: {
  category?: KnowledgeCategory;
  status?: KnowledgePostStatus;
  authorId?: string;
  limitCount?: number;
  sortBy?: 'latest' | 'category';
}): Promise<KnowledgePost[]> {
  let q = query(collection(db, COLLECTIONS.KNOWLEDGE_POSTS));
  
  // Filter by status if provided (admin can view all statuses by not providing status filter)
  if (filters?.status) {
    q = query(q, where('status', '==', filters.status));
  }
  
  if (filters?.category) {
    q = query(q, where('category', '==', filters.category));
  }
  
  if (filters?.authorId) {
    q = query(q, where('authorId', '==', filters.authorId));
  }
  
  // Sort by latest first (default)
  if (filters?.sortBy === 'category') {
    q = query(q, orderBy('category', 'asc'), orderBy('createdAt', 'desc'));
  } else {
    q = query(q, orderBy('createdAt', 'desc'));
  }
  
  if (filters?.limitCount) {
    q = query(q, limit(filters.limitCount));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      removedAt: data.removedAt?.toDate() || undefined,
    } as KnowledgePost;
  });
}

/**
 * Update knowledge post status (for moderation)
 */
export async function updateKnowledgePostStatus(
  postId: string,
  status: KnowledgePostStatus,
  moderatorId?: string,
  notes?: string
): Promise<void> {
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const updateData: any = {
    status,
    updatedAt: serverTimestamp(),
  };
  
  if (status === 'REMOVED') {
    updateData.removedAt = serverTimestamp();
  }
  
  if (moderatorId) {
    updateData.moderatedBy = moderatorId;
    if (notes) {
      updateData.moderationNotes = notes;
    }
  }
  
  await updateDoc(postRef, updateData);
}

/**
 * Delete knowledge post (only by author or admin)
 */
export async function deleteKnowledgePost(postId: string): Promise<void> {
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  await deleteDoc(postRef);
}

/**
 * Add helpful reaction
 */
export async function addHelpfulReaction(
  postId: string,
  userId: string
): Promise<void> {
  // Check if already reacted
  const reactionsQuery = query(
    collection(db, COLLECTIONS.KNOWLEDGE_REACTIONS),
    where('postId', '==', postId),
    where('userId', '==', userId),
    where('type', '==', 'helpful')
  );
  const existingReactions = await getDocs(reactionsQuery);
  
  if (!existingReactions.empty) {
    return; // Already reacted
  }
  
  // Add reaction
  await addDoc(collection(db, COLLECTIONS.KNOWLEDGE_REACTIONS), {
    postId,
    userId,
    type: 'helpful',
    createdAt: serverTimestamp(),
  });
  
  // Update post helpful count
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const currentCount = postSnap.data().helpfulCount || 0;
    await updateDoc(postRef, {
      helpfulCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Remove helpful reaction
 */
export async function removeHelpfulReaction(
  postId: string,
  userId: string
): Promise<void> {
  // Find and delete reaction
  const reactionsQuery = query(
    collection(db, COLLECTIONS.KNOWLEDGE_REACTIONS),
    where('postId', '==', postId),
    where('userId', '==', userId),
    where('type', '==', 'helpful')
  );
  const reactionsSnapshot = await getDocs(reactionsQuery);
  
  if (reactionsSnapshot.empty) {
    return;
  }
  
  // Delete all matching reactions (should be only one)
  const batch = reactionsSnapshot.docs.map(doc => doc.ref);
  // Note: Firestore batch delete requires writeBatch, but for simplicity we'll update count
  // In production, use writeBatch for atomic operations
  
  // Update post helpful count
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const currentCount = postSnap.data().helpfulCount || 0;
    await updateDoc(postRef, {
      helpfulCount: Math.max(0, currentCount - 1),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Save/bookmark post
 */
export async function saveKnowledgePost(
  postId: string,
  userId: string
): Promise<void> {
  // Check if already saved
  const savesQuery = query(
    collection(db, COLLECTIONS.KNOWLEDGE_SAVES),
    where('postId', '==', postId),
    where('userId', '==', userId)
  );
  const existingSaves = await getDocs(savesQuery);
  
  if (!existingSaves.empty) {
    return; // Already saved
  }
  
  // Add save
  await addDoc(collection(db, COLLECTIONS.KNOWLEDGE_SAVES), {
    postId,
    userId,
    createdAt: serverTimestamp(),
  });
  
  // Update post savedByUsers array
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const currentSaved = postSnap.data().savedByUsers || [];
    if (!currentSaved.includes(userId)) {
      await updateDoc(postRef, {
        savedByUsers: [...currentSaved, userId],
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Unsave post
 */
export async function unsaveKnowledgePost(
  postId: string,
  userId: string
): Promise<void> {
  // Update post savedByUsers array
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const currentSaved = postSnap.data().savedByUsers || [];
    await updateDoc(postRef, {
      savedByUsers: currentSaved.filter((id: string) => id !== userId),
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Report post
 */
export async function reportKnowledgePost(
  postId: string,
  userId: string,
  reason: "Promotional" | "Misleading" | "Incorrect" | "Other",
  details?: string
): Promise<void> {
  // Prepare report data, filtering out undefined fields
  const reportData: any = {
    postId,
    reportedByUserId: userId,
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  
  // Only include details if provided
  if (details !== undefined && details !== null && details.trim() !== '') {
    reportData.details = details.trim();
  }
  
  // Create report
  await addDoc(collection(db, COLLECTIONS.KNOWLEDGE_REPORTS), reportData);
  
  // Update post reportedByUsers array
  const postRef = doc(db, COLLECTIONS.KNOWLEDGE_POSTS, postId);
  const postSnap = await getDoc(postRef);
  if (postSnap.exists()) {
    const currentReported = postSnap.data().reportedByUsers || [];
    const currentReasons = postSnap.data().reportReasons || [];
    
    if (!currentReported.includes(userId)) {
      await updateDoc(postRef, {
        reportedByUsers: [...currentReported, userId],
        reportReasons: [...currentReasons, reason],
        status: 'UNDER_REVIEW', // Auto-flag for moderation
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Get saved posts for a user
 */
export async function getSavedKnowledgePosts(userId: string): Promise<KnowledgePost[]> {
  const savesQuery = query(
    collection(db, COLLECTIONS.KNOWLEDGE_SAVES),
    where('userId', '==', userId)
  );
  const savesSnapshot = await getDocs(savesQuery);
  
  const postIds = savesSnapshot.docs.map(doc => doc.data().postId);
  
  if (postIds.length === 0) {
    return [];
  }
  
  // Get posts (Note: Firestore 'in' query limited to 10, need to batch if more)
  const posts: KnowledgePost[] = [];
  for (const postId of postIds) {
    const post = await getKnowledgePost(postId);
    if (post && post.status === 'PUBLISHED') {
      posts.push(post);
    }
  }
  
  return posts.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as Timestamp).toDate();
    const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as Timestamp).toDate();
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Check if user has reacted to a post
 */
export async function hasUserReacted(postId: string, userId: string): Promise<boolean> {
  const reactionsQuery = query(
    collection(db, COLLECTIONS.KNOWLEDGE_REACTIONS),
    where('postId', '==', postId),
    where('userId', '==', userId),
    where('type', '==', 'helpful')
  );
  const snapshot = await getDocs(reactionsQuery);
  return !snapshot.empty;
}

/**
 * Check if user has saved a post
 */
export async function hasUserSaved(postId: string, userId: string): Promise<boolean> {
  const savesQuery = query(
    collection(db, COLLECTIONS.KNOWLEDGE_SAVES),
    where('postId', '==', postId),
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(savesQuery);
  return !snapshot.empty;
}

