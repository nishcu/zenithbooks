/**
 * CA Team Workload Management
 * Track and manage workload for CA team professionals
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAssignedApplications } from './firestore';
import type { ITRApplication, ITRStatus } from './types';

export interface CAWorkload {
  professionalId: string;
  professionalName?: string;
  professionalEmail?: string;
  totalAssigned: number;
  byStatus: Record<ITRStatus, number>;
  inProgress: number;
  completed: number;
  averageProcessingTime?: number; // in days
  lastActivity?: Date;
}

/**
 * Get workload statistics for a specific professional
 */
export async function getProfessionalWorkload(professionalId: string): Promise<CAWorkload> {
  const applications = await getAssignedApplications(professionalId);
  
  const byStatus: Partial<Record<ITRStatus, number>> = {};
  let inProgress = 0;
  let completed = 0;
  let totalProcessingTime = 0;
  let completedCount = 0;
  let lastActivity: Date | undefined;

  applications.forEach(app => {
    // Count by status
    const status = app.status;
    byStatus[status] = (byStatus[status] || 0) + 1;

    // Count in progress
    if (status !== 'COMPLETED' && status !== 'REJECTED') {
      inProgress++;
    }

    // Count completed
    if (status === 'COMPLETED') {
      completed++;
    }

    // Calculate processing time for completed applications
    if (status === 'COMPLETED' && app.completedAt && app.createdAt) {
      const created = app.createdAt instanceof Date ? app.createdAt : new Date(app.createdAt);
      const completed = app.completedAt instanceof Date ? app.completedAt : new Date(app.completedAt);
      const days = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      totalProcessingTime += days;
      completedCount++;
    }

    // Track last activity
    const updated = app.updatedAt instanceof Date ? app.updatedAt : new Date(app.updatedAt);
    if (!lastActivity || updated > lastActivity) {
      lastActivity = updated;
    }
  });

  // Get professional details
  let professionalName: string | undefined;
  let professionalEmail: string | undefined;
  try {
    const userDoc = await getDoc(doc(db, 'users', professionalId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      professionalName = userData.name || userData.companyName;
      professionalEmail = userData.email;
    }
  } catch (error) {
    console.error('Error fetching professional details:', error);
  }

  return {
    professionalId,
    professionalName,
    professionalEmail,
    totalAssigned: applications.length,
    byStatus: byStatus as Record<ITRStatus, number>,
    inProgress,
    completed,
    averageProcessingTime: completedCount > 0 ? totalProcessingTime / completedCount : undefined,
    lastActivity,
  };
}

/**
 * Get workload for all professionals
 */
export async function getAllProfessionalsWorkload(): Promise<CAWorkload[]> {
  // Get all professionals from users collection
  const usersRef = collection(db, 'users');
  const professionalsQuery = query(usersRef, where('userType', '==', 'professional'));
  const professionalsSnapshot = await getDocs(professionalsQuery);

  const workloads: CAWorkload[] = [];

  for (const profDoc of professionalsSnapshot.docs) {
    const professionalId = profDoc.id;
    const workload = await getProfessionalWorkload(professionalId);
    workloads.push(workload);
  }

  // Sort by total assigned (descending)
  workloads.sort((a, b) => b.totalAssigned - a.totalAssigned);

  return workloads;
}

/**
 * Get available professionals (low workload)
 */
export async function getAvailableProfessionals(
  maxWorkload: number = 10
): Promise<CAWorkload[]> {
  const workloads = await getAllProfessionalsWorkload();
  return workloads.filter(w => w.inProgress < maxWorkload);
}

/**
 * Get overloaded professionals (high workload)
 */
export async function getOverloadedProfessionals(
  maxWorkload: number = 20
): Promise<CAWorkload[]> {
  const workloads = await getAllProfessionalsWorkload();
  return workloads.filter(w => w.inProgress >= maxWorkload);
}

