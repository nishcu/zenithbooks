/**
 * Professional Profiles - Firestore Service
 * Isolated module - new collections only
 */

import {
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProfessionalProfile } from './types';

const COLLECTIONS = {
  PROFESSIONALS_PROFILES: 'professionals_profiles',
};

/**
 * Create or update professional profile
 */
export async function createOrUpdateProfessionalProfile(
  userId: string,
  profileData: Omit<ProfessionalProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const profileRef = doc(db, COLLECTIONS.PROFESSIONALS_PROFILES, userId);
  
  const existingDoc = await getDoc(profileRef);
  const now = serverTimestamp();
  
  if (existingDoc.exists()) {
    // Update existing profile
    await updateDoc(profileRef, {
      ...profileData,
      updatedAt: now,
    });
    return userId;
  } else {
    // Create new profile
    await setDoc(profileRef, {
      ...profileData,
      userId,
      createdAt: now,
      updatedAt: now,
      isVerified: false,
      rating: 0,
      totalReviews: 0,
    });
    return userId;
  }
}

/**
 * Get professional profile by userId
 */
export async function getProfessionalProfile(userId: string): Promise<ProfessionalProfile | null> {
  const profileRef = doc(db, COLLECTIONS.PROFESSIONALS_PROFILES, userId);
  const profileSnap = await getDoc(profileRef);
  
  if (!profileSnap.exists()) {
    return null;
  }
  
  const data = profileSnap.data();
  return {
    id: profileSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  } as ProfessionalProfile;
}

/**
 * Get professional profile by profile ID
 */
export async function getProfessionalProfileById(profileId: string): Promise<ProfessionalProfile | null> {
  return getProfessionalProfile(profileId);
}

/**
 * List all professionals with optional filters
 */
export async function listProfessionals(filters?: {
  state?: string;
  city?: string;
  skills?: string[];
  minExperience?: number;
  isVerified?: boolean;
  limitCount?: number;
}): Promise<ProfessionalProfile[]> {
  let q = query(collection(db, COLLECTIONS.PROFESSIONALS_PROFILES));
  
  // Apply filters
  if (filters?.state) {
    q = query(q, where('locations', 'array-contains', filters.state));
  }
  
  if (filters?.city) {
    q = query(q, where('locations', 'array-contains', filters.city));
  }
  
  if (filters?.isVerified !== undefined) {
    q = query(q, where('isVerified', '==', filters.isVerified));
  }
  
  if (filters?.minExperience) {
    q = query(q, where('experience', '>=', filters.minExperience));
  }
  
  // Order by createdAt (newest first)
  // Note: Rating ordering is done client-side to avoid index requirements
  q = query(q, orderBy('createdAt', 'desc'));
  
  if (filters?.limitCount) {
    q = query(q, limit(filters.limitCount));
  }
  
  const snapshot = await getDocs(q);
  let professionals = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as ProfessionalProfile;
  });
  
  // Sort by rating (client-side) after fetching
  professionals.sort((a, b) => {
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    // If ratings are equal, sort by createdAt (newest first)
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
  
  // Filter by skills if provided (client-side as Firestore doesn't support array-contains-any easily)
  if (filters?.skills && filters.skills.length > 0) {
    return professionals.filter((prof) =>
      filters.skills!.some((skill) => prof.skills.includes(skill))
    );
  }
  
  return professionals;
}

/**
 * Search professionals by name or skills
 */
export async function searchProfessionals(searchTerm: string): Promise<ProfessionalProfile[]> {
  const allProfessionals = await listProfessionals();
  const term = searchTerm.toLowerCase();
  
  return allProfessionals.filter((prof) => {
    const nameMatch = prof.fullName.toLowerCase().includes(term);
    const firmMatch = prof.firmName?.toLowerCase().includes(term);
    const skillsMatch = prof.skills.some((skill) => skill.toLowerCase().includes(term));
    
    return nameMatch || firmMatch || skillsMatch;
  });
}

/**
 * Update professional verification status (admin only)
 */
export async function updateProfessionalVerification(
  userId: string,
  isVerified: boolean
): Promise<void> {
  const profileRef = doc(db, COLLECTIONS.PROFESSIONALS_PROFILES, userId);
  await updateDoc(profileRef, {
    isVerified,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update professional rating (called after review)
 */
export async function updateProfessionalRating(
  userId: string,
  newRating: number
): Promise<void> {
  const profile = await getProfessionalProfile(userId);
  if (!profile) return;
  
  const totalReviews = (profile.totalReviews || 0) + 1;
  const currentRating = profile.rating || 0;
  const currentTotal = (profile.totalReviews || 0) * currentRating;
  const newAverageRating = (currentTotal + newRating) / totalReviews;
  
  const profileRef = doc(db, COLLECTIONS.PROFESSIONALS_PROFILES, userId);
  await updateDoc(profileRef, {
    rating: newAverageRating,
    totalReviews: totalReviews,
    updatedAt: serverTimestamp(),
  });
}

