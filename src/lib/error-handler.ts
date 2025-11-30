/**
 * Centralized error handling utilities
 */

import { ERROR_CODES, TOAST_MESSAGES } from "./constants";
import { toast } from "@/hooks/use-toast";

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standardized error handler
 */
export function handleError(error: unknown, context?: string): AppError {
  let appError: AppError;

  if (error instanceof Error) {
    // Firebase Auth Errors - Map to user-friendly messages
    // Firebase errors have a 'code' property (e.g., 'auth/wrong-password')
    const errorCode = (error as any).code || '';
    const errorMessage = (error.message || '').toLowerCase();
    const codeStr = String(errorCode).toLowerCase();
    
    // Check if it's a Firebase auth error (by code or message)
    if (codeStr.includes("auth/") || errorMessage.includes("auth/")) {
      // Check for specific Firebase auth error codes
      // Firebase error codes are like: auth/wrong-password, auth/user-not-found, etc.
      if (codeStr.includes("user-not-found") || errorMessage.includes("user-not-found")) {
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: "We couldn't find an account with this email. Please check your email or sign up for a new account.",
        };
      } else if (codeStr.includes("wrong-password") || codeStr.includes("invalid-credential") || 
                 errorMessage.includes("wrong-password") || errorMessage.includes("invalid-credential")) {
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: "The password you entered is incorrect. Please try again or use 'Forgot Password' to reset it.",
        };
      } else if (codeStr.includes("email-already-in-use") || errorMessage.includes("email-already-in-use")) {
        appError = {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "This email is already registered! Please sign in instead, or use a different email address.",
        };
      } else if (codeStr.includes("invalid-email") || errorMessage.includes("invalid-email")) {
        appError = {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Please enter a valid email address (e.g., yourname@example.com).",
        };
      } else if (codeStr.includes("weak-password") || errorMessage.includes("weak-password")) {
        appError = {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "Your password needs to be stronger. Please use at least 8 characters with a mix of letters and numbers.",
        };
      } else if (codeStr.includes("user-disabled") || errorMessage.includes("user-disabled")) {
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: "This account has been temporarily disabled. Please contact our support team for assistance.",
        };
      } else if (codeStr.includes("too-many-requests") || errorMessage.includes("too-many-requests")) {
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: "Too many attempts! Please wait a few minutes before trying again.",
        };
      } else if (codeStr.includes("network-request-failed") || errorMessage.includes("network-request-failed")) {
        appError = {
          code: ERROR_CODES.NETWORK_ERROR,
          message: "Looks like there's a connection issue. Please check your internet and try again.",
        };
      } else {
        // Generic auth error - don't expose Firebase details
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: "We couldn't sign you in. Please check your email and password, or try again in a moment.",
        };
      }
    }
    // Network Errors
    else if (error.message.includes("network") || error.message.includes("fetch")) {
      appError = {
        code: ERROR_CODES.NETWORK_ERROR,
        message: TOAST_MESSAGES.ERROR.NETWORK.description,
      };
    }
    // Generic Error
    else {
      appError = {
        code: ERROR_CODES.SERVER_ERROR,
        message: error.message || TOAST_MESSAGES.ERROR.GENERIC.description,
      };
    }
  } else if (typeof error === "string") {
    appError = {
      code: ERROR_CODES.SERVER_ERROR,
      message: error,
    };
  } else {
    appError = {
      code: ERROR_CODES.SERVER_ERROR,
      message: TOAST_MESSAGES.ERROR.GENERIC.description,
    };
  }

  // Log error with context
  console.error(`[${context || "Error"}]`, appError, error);

  return appError;
}

/**
 * Show error toast notification (friendly, non-destructive for user errors)
 */
export function showErrorToast(error: unknown, context?: string) {
  const appError = handleError(error, context);
  // Only use destructive variant for security-critical errors
  const isCritical = appError.code === ERROR_CODES.AUTH_REQUIRED && 
                     (appError.message.includes('disabled') || 
                      appError.message.includes('locked'));
  
  toast({
    variant: isCritical ? "destructive" : "default",
    title: isCritical ? "Security Alert" : "Oops!",
    description: appError.message,
  });
}

/**
 * Show success toast notification
 */
export function showSuccessToast(title: string, description?: string) {
  toast({
    title,
    description,
  });
}

/**
 * Async error wrapper for try-catch blocks
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    showErrorToast(error, context);
    return null;
  }
}

