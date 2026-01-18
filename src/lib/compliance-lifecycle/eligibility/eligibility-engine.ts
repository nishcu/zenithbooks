/**
 * Plan Eligibility Engine
 * Evaluates business data and recommends suitable compliance plans
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlanRecommendation } from '../types';
import { createComplianceAuditEntry } from '../audit/audit-service';

const COLLECTIONS = {
  PLAN_RECOMMENDATIONS: 'plan_recommendations',
};

/**
 * Evaluate PF eligibility based on employee count
 */
export async function evaluatePFEligibility(
  userId: string,
  firmId: string,
  employeeCount: number
): Promise<string | null> {
  if (employeeCount >= 20) {
    const recommendationId = await createRecommendation({
      userId,
      firmId,
      recommendationType: 'pf_required',
      currentStatus: `Current employee count: ${employeeCount}`,
      recommendedAction: 'PF compliance is mandatory for businesses with 20+ employees',
      benefitDescription: 'Ensure compliance with Employees Provident Fund Act to avoid penalties and legal issues',
      triggerData: {
        employeeCount,
        threshold: 20,
      },
    });

    return recommendationId;
  }

  return null;
}

/**
 * Evaluate ESI eligibility based on employee count
 */
export async function evaluateESIEligibility(
  userId: string,
  firmId: string,
  employeeCount: number
): Promise<string | null> {
  if (employeeCount >= 10 && employeeCount < 20) {
    const recommendationId = await createRecommendation({
      userId,
      firmId,
      recommendationType: 'esi_required',
      currentStatus: `Current employee count: ${employeeCount}`,
      recommendedAction: 'ESI compliance is mandatory for businesses with 10-20 employees',
      benefitDescription: 'Ensure compliance with Employees State Insurance Act for employee welfare',
      triggerData: {
        employeeCount,
        threshold: 10,
      },
    });

    return recommendationId;
  }

  return null;
}

/**
 * Evaluate MCA compliance for private limited companies
 */
export async function evaluateMCACompliance(
  userId: string,
  firmId: string,
  entityType: string
): Promise<string | null> {
  if (['private_limited', 'public_limited', 'one_person_company'].includes(entityType)) {
    const recommendationId = await createRecommendation({
      userId,
      firmId,
      recommendationType: 'mca_compliance_required',
      currentStatus: `Entity type: ${entityType}`,
      recommendedAction: 'MCA compliance is mandatory for companies (Annual Returns, AOC-4, MGT-7)',
      benefitDescription: 'Ensure timely filing of annual returns and financial statements to maintain company status',
      triggerData: {
        entityType,
      },
    });

    return recommendationId;
  }

  return null;
}

/**
 * Evaluate GST plan upgrade based on turnover
 */
export async function evaluateGSTPlanUpgrade(
  userId: string,
  firmId: string,
  annualTurnover: number
): Promise<string | null> {
  if (annualTurnover >= 5000000) {
    const recommendationId = await createRecommendation({
      userId,
      firmId,
      recommendationType: 'gst_plan_upgrade',
      currentStatus: `Annual turnover: ₹${annualTurnover.toLocaleString()}`,
      recommendedAction: 'Consider upgrading to Enterprise Compliance Plan for comprehensive GST management',
      benefitDescription: 'Enterprise plan includes GSTR-9C reconciliation, advanced analytics, and priority support',
      triggerData: {
        annualTurnover,
        threshold: 5000000,
      },
    });

    return recommendationId;
  }

  return null;
}

/**
 * Comprehensive eligibility check
 */
export async function performEligibilityCheck(
  userId: string,
  firmId: string,
  businessData: {
    employeeCount?: number;
    entityType?: string;
    annualTurnover?: number;
    gstRegistered?: boolean;
  }
): Promise<string[]> {
  const recommendationIds: string[] = [];

  // PF check
  if (businessData.employeeCount !== undefined) {
    const pfRecId = await evaluatePFEligibility(userId, firmId, businessData.employeeCount);
    if (pfRecId) recommendationIds.push(pfRecId);

    // ESI check
    const esiRecId = await evaluateESIEligibility(userId, firmId, businessData.employeeCount);
    if (esiRecId) recommendationIds.push(esiRecId);
  }

  // MCA check
  if (businessData.entityType) {
    const mcaRecId = await evaluateMCACompliance(userId, firmId, businessData.entityType);
    if (mcaRecId) recommendationIds.push(mcaRecId);
  }

  // GST plan upgrade check
  if (businessData.annualTurnover !== undefined) {
    const gstRecId = await evaluateGSTPlanUpgrade(userId, firmId, businessData.annualTurnover);
    if (gstRecId) recommendationIds.push(gstRecId);
  }

  // Create audit log
  if (recommendationIds.length > 0) {
    await createComplianceAuditEntry({
      userId,
      firmId,
      action: 'plan_eligibility_checked',
      entityType: 'recommendation',
      entityId: '',
      details: {
        recommendationsCreated: recommendationIds.length,
        businessData,
      },
      performedBy: 'system',
    });
  }

  return recommendationIds;
}

/**
 * Create a recommendation record
 */
async function createRecommendation(
  recommendationData: Omit<PlanRecommendation, 'id' | 'presentedAt' | 'status'>
): Promise<string> {
  const recommendationRef = await addDoc(collection(db, COLLECTIONS.PLAN_RECOMMENDATIONS), {
    ...recommendationData,
    status: 'active',
    presentedAt: serverTimestamp(),
  });

  // Create audit log
  await createComplianceAuditEntry({
    userId: recommendationData.userId,
    firmId: recommendationData.firmId,
    action: 'recommendation_presented',
    entityType: 'recommendation',
    entityId: recommendationRef.id,
    details: {
      recommendationType: recommendationData.recommendationType,
    },
    performedBy: 'system',
  });

  return recommendationRef.id;
}

/**
 * Get active recommendations for a user/firm
 */
export async function getActiveRecommendations(
  userId: string,
  firmId?: string
): Promise<PlanRecommendation[]> {
  const recommendationsQuery = firmId
    ? query(
        collection(db, COLLECTIONS.PLAN_RECOMMENDATIONS),
        where('userId', '==', userId),
        where('firmId', '==', firmId),
        where('status', '==', 'active')
      )
    : query(
        collection(db, COLLECTIONS.PLAN_RECOMMENDATIONS),
        where('userId', '==', userId),
        where('status', '==', 'active')
      );

  const recommendationsSnapshot = await getDocs(recommendationsQuery);
  
  return recommendationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as PlanRecommendation));
}

