/**
 * Vault Security Utilities
 * Rate limiting and security features for Document Vault
 */

import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, query, where, orderBy, limit as firestoreLimit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RateLimitRecord {
  attempts: number;
  lastAttempt: any;
  lockedUntil?: any;
}

const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  WINDOW_MS: 60 * 60 * 1000, // 1 hour window
};

/**
 * Check and enforce rate limiting for share code validation
 * Returns true if request should be allowed, false if rate limited
 */
export async function checkRateLimit(clientIp: string): Promise<{
  allowed: boolean;
  remainingAttempts: number;
  lockoutUntil?: Date;
}> {
  try {
    const rateLimitRef = doc(db, "vaultRateLimits", clientIp);
    const rateLimitDoc = await getDoc(rateLimitRef);
    
    const now = new Date();
    let record: RateLimitRecord;
    
    if (rateLimitDoc.exists()) {
      record = rateLimitDoc.data() as RateLimitRecord;
      const lastAttempt = record.lastAttempt?.toDate 
        ? record.lastAttempt.toDate() 
        : new Date(record.lastAttempt);
      
      // Check if locked
      if (record.lockedUntil) {
        const lockoutUntil = record.lockedUntil.toDate 
          ? record.lockedUntil.toDate() 
          : new Date(record.lockedUntil);
        
        if (lockoutUntil > now) {
          return {
            allowed: false,
            remainingAttempts: 0,
            lockoutUntil,
          };
        } else {
          // Lockout expired, reset
          record = {
            attempts: 0,
            lastAttempt: serverTimestamp(),
          };
        }
      } else {
        // Check if outside time window
        const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
        if (timeSinceLastAttempt > RATE_LIMIT_CONFIG.WINDOW_MS) {
          // Reset window
          record = {
            attempts: 1,
            lastAttempt: serverTimestamp(),
          };
        } else {
          // Increment attempts
          record = {
            attempts: (record.attempts || 0) + 1,
            lastAttempt: serverTimestamp(),
          };
        }
      }
    } else {
      // First attempt
      record = {
        attempts: 1,
        lastAttempt: serverTimestamp(),
      };
    }
    
    // Check if should lock
    if (record.attempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS) {
      const lockoutUntil = new Date(now.getTime() + RATE_LIMIT_CONFIG.LOCKOUT_DURATION_MS);
      record.lockedUntil = serverTimestamp(); // Will be converted properly
      
      await setDoc(rateLimitRef, {
        ...record,
        lockedUntil: Timestamp.fromDate(lockoutUntil),
      }, { merge: true });
      
      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutUntil,
      };
    }
    
    // Update record
    await setDoc(rateLimitRef, {
      attempts: record.attempts,
      lastAttempt: serverTimestamp(),
      lockedUntil: null,
    }, { merge: true });
    
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS - record.attempts,
    };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remainingAttempts: RATE_LIMIT_CONFIG.MAX_ATTEMPTS,
    };
  }
}

/**
 * Reset rate limit for an IP (for successful validation)
 */
export async function resetRateLimit(clientIp: string): Promise<void> {
  try {
    const rateLimitRef = doc(db, "vaultRateLimits", clientIp);
    await setDoc(rateLimitRef, {
      attempts: 0,
      lastAttempt: serverTimestamp(),
      lockedUntil: null,
    }, { merge: true });
  } catch (error) {
    console.error("Error resetting rate limit:", error);
  }
}

/**
 * Check for suspicious activity patterns
 */
export async function checkSuspiciousActivity(
  userId: string,
  shareCodeId: string,
  clientIp: string
): Promise<{
  suspicious: boolean;
  reason?: string;
}> {
  try {
    // Check for multiple IPs accessing same share code in short time
    const accessLogsRef = collection(db, "vaultAccessLogs");
    const recentLogsQuery = query(
      accessLogsRef,
      where("userId", "==", userId),
      where("shareCodeId", "==", shareCodeId),
      orderBy("accessedAt", "desc"),
      limit(10)
    );
    
    const snapshot = await getDocs(recentLogsQuery);
    const recentIPs = new Set<string>();
    const now = new Date();
    
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const accessedAt = data.accessedAt?.toDate 
        ? data.accessedAt.toDate() 
        : new Date(data.accessedAt);
      
      // Check last 1 hour
      if (now.getTime() - accessedAt.getTime() < 60 * 60 * 1000) {
        if (data.clientIp) {
          recentIPs.add(data.clientIp);
        }
      }
    });
    
    // If more than 5 different IPs accessed in last hour, suspicious
    if (recentIPs.size > 5) {
      return {
        suspicious: true,
        reason: `Multiple IP addresses (${recentIPs.size}) accessed this share code in the last hour.`,
      };
    }
    
    // Check for rapid access from same IP
    const sameIPCount = snapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.clientIp === clientIp;
    }).length;
    
    if (sameIPCount > 20) {
      return {
        suspicious: true,
        reason: `Excessive access attempts (${sameIPCount}) from the same IP address.`,
      };
    }
    
    return { suspicious: false };
  } catch (error) {
    console.error("Error checking suspicious activity:", error);
    return { suspicious: false };
  }
}

