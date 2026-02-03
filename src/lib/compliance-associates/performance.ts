/**
 * Zenith Corporate Mitra - Performance Scoring Engine
 * Recalculates score, updates riskFlag, logs to corporate_mitra_audit_logs
 */

import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ComplianceAssociate, CorporateMitraPerformance, CorporateMitraLevel, CorporateMitraCertifications } from './types';
import { LEVEL_UP_CONDITIONS } from './constants';
import { createCorporateMitraAuditLog } from './firestore';

const COLLECTIONS = {
  COMPLIANCE_ASSOCIATES: 'compliance_associates',
  COMPLIANCE_TASK_EXECUTIONS: 'compliance_task_executions',
};

/** Score formula (adjustable): accuracyRate*0.4 + turnaroundScore*0.3 + (100-reworkPenalty)*0.2 + experienceBonus*0.1 */
export function calculatePerformanceScore(params: {
  accuracyRate: number;
  avgTurnaroundHours: number;
  reworkCount: number;
  yearsOfExperience: number;
  tasksCompleted: number;
}): number {
  const { accuracyRate, avgTurnaroundHours, reworkCount, yearsOfExperience, tasksCompleted } = params;
  // Turnaround: lower hours = higher score (e.g. 24h = 100, 72h = 60, 168h = 30)
  const turnaroundScore = Math.max(0, Math.min(100, 120 - avgTurnaroundHours / 2));
  const reworkPenalty = Math.min(100, reworkCount * 5);
  const experienceBonus = Math.min(20, yearsOfExperience * 2) + Math.min(10, Math.floor(tasksCompleted / 20));
  const score =
    accuracyRate * 0.4 +
    turnaroundScore * 0.3 +
    (100 - reworkPenalty) * 0.2 +
    experienceBonus * 0.1;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** Derive riskFlag from score */
export function scoreToRiskFlag(score: number): 'low' | 'medium' | 'high' {
  if (score >= 75) return 'low';
  if (score >= 50) return 'medium';
  return 'high';
}

/** Check if associate meets level upgrade conditions (CM-L2, CM-L3). CM-L4 is admin only. */
export function getNextEligibleLevel(
  currentLevel: CorporateMitraLevel,
  tasksCompleted: number,
  score: number
): CorporateMitraLevel | null {
  const levels: CorporateMitraLevel[] = ['CM-L1', 'CM-L2', 'CM-L3', 'CM-L4'];
  const idx = levels.indexOf(currentLevel);
  if (idx >= 3) return null;
  const next = levels[idx + 1];
  const cond = LEVEL_UP_CONDITIONS[next];
  if (cond.adminOnly) return null; // CM-L4 only via admin
  if (tasksCompleted >= cond.minTasks && score >= cond.minScore) return next;
  return null;
}

/**
 * Recalculate performance for an associate and update Firestore + audit log
 */
export async function recalculateAndUpdatePerformance(associateId: string): Promise<CorporateMitraPerformance> {
  const ref = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Associate not found');
  const associate = { id: snap.id, ...snap.data() } as ComplianceAssociate;

  const tasksRef = collection(db, COLLECTIONS.COMPLIANCE_TASK_EXECUTIONS);
  const q = query(tasksRef, where('assignedTo', '==', associate.associateCode));
  const taskSnap = await getDocs(q);
  const tasks = taskSnap.docs.map(d => d.data());

  const completed = tasks.filter(t => ['completed', 'filed', 'closed', 'approved'].includes(t.status as string)).length;
  const reworkCount = (associate.performance?.reworkCount ?? 0);
  const avgTurnaroundHours = associate.performance?.avgTurnaroundHours ?? 48;
  const accuracyRate = completed > 0 ? Math.min(100, 100 - reworkCount * 2) : 0;

  const score = calculatePerformanceScore({
    accuracyRate,
    avgTurnaroundHours,
    reworkCount,
    yearsOfExperience: associate.yearsOfExperience ?? 0,
    tasksCompleted: associate.tasksCompleted ?? completed,
  });

  const riskFlag = scoreToRiskFlag(score);
  const performance: CorporateMitraPerformance = {
    score,
    accuracyRate,
    avgTurnaroundHours,
    reworkCount,
    lastEvaluatedAt: new Date() as any,
  };

  await updateDoc(ref, {
    performance,
    riskFlag,
    updatedAt: serverTimestamp(),
  });

  await createCorporateMitraAuditLog({
    associateId,
    associateCode: associate.associateCode,
    action: 'score_update',
    meta: { score, riskFlag, accuracyRate, reworkCount },
  });

  return performance;
}

/**
 * Evaluate level upgrade for associate (auto). CM-L4 is not set by this; admin only.
 */
export async function evaluateLevelUpgrade(associateId: string): Promise<CorporateMitraLevel | null> {
  const ref = doc(db, COLLECTIONS.COMPLIANCE_ASSOCIATES, associateId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Associate not found');
  const associate = { id: snap.id, ...snap.data() } as ComplianceAssociate;
  const level = associate.level ?? 'CM-L1';
  const score = associate.performance?.score ?? 50;
  const tasksCompleted = associate.tasksCompleted ?? 0;

  const next = getNextEligibleLevel(level, tasksCompleted, score);
  if (!next || next === 'CM-L4') return null;

  const { updateDoc, serverTimestamp } = await import('firebase/firestore');
  await updateDoc(ref, { level: next, updatedAt: serverTimestamp() });
  await createCorporateMitraAuditLog({
    associateId,
    associateCode: associate.associateCode,
    action: 'level_up',
    meta: { previousLevel: level, newLevel: next, trigger: 'auto' },
  });
  return next;
}
