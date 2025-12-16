/**
 * Authentication security utilities
 * Provides functions to strengthen authentication flows
 */

import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export const defaultPasswordRequirements: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Check password strength
 */
export function checkPasswordStrength(
  password: string,
  requirements: PasswordRequirements = defaultPasswordRequirements
): {
  valid: boolean;
  score: number; // 0-4
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= requirements.minLength) {
    score++;
  } else {
    feedback.push(`Password must be at least ${requirements.minLength} characters long`);
  }

  if (requirements.requireUppercase && /[A-Z]/.test(password)) {
    score++;
  } else if (requirements.requireUppercase) {
    feedback.push("Password must contain at least one uppercase letter");
  }

  if (requirements.requireLowercase && /[a-z]/.test(password)) {
    score++;
  } else if (requirements.requireLowercase) {
    feedback.push("Password must contain at least one lowercase letter");
  }

  if (requirements.requireNumbers && /[0-9]/.test(password)) {
    score++;
  } else if (requirements.requireNumbers) {
    feedback.push("Password must contain at least one number");
  }

  if (requirements.requireSpecialChars && /[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score++;
  } else if (requirements.requireSpecialChars) {
    feedback.push("Password must contain at least one special character");
  }

  return {
    valid: score === 5,
    score,
    feedback,
  };
}

/**
 * Account lockout tracking (in production, use database)
 */
const loginAttempts = new Map<string, { count: number; lockoutUntil: number }>();

/**
 * Check if account is locked
 */
export function isAccountLocked(identifier: string): boolean {
  const record = loginAttempts.get(identifier);
  if (!record) {
    return false;
  }

  if (record.lockoutUntil > Date.now()) {
    return true;
  }

  // Lockout expired, reset
  loginAttempts.delete(identifier);
  return false;
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(identifier: string): {
  locked: boolean;
  remainingAttempts: number;
  lockoutUntil?: number;
} {
  const maxAttempts = 5;
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes

  const record = loginAttempts.get(identifier) || { count: 0, lockoutUntil: 0 };

  // If already locked, return lockout info
  if (record.lockoutUntil > Date.now()) {
    return {
      locked: true,
      remainingAttempts: 0,
      lockoutUntil: record.lockoutUntil,
    };
  }

  // Increment failed attempts
  record.count++;

  if (record.count >= maxAttempts) {
    // Lock account
    record.lockoutUntil = Date.now() + lockoutDuration;
    loginAttempts.set(identifier, record);
    return {
      locked: true,
      remainingAttempts: 0,
      lockoutUntil: record.lockoutUntil,
    };
  }

  loginAttempts.set(identifier, record);
  return {
    locked: false,
    remainingAttempts: maxAttempts - record.count,
  };
}

/**
 * Clear failed login attempts (on successful login)
 */
export function clearFailedLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

/**
 * Get identifier for login attempts (email or IP)
 */
export function getLoginIdentifier(email?: string, ip?: string): string {
  return email || ip || "unknown";
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

