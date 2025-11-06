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
    // Firebase Auth Errors
    if (error.message.includes("auth/")) {
      if (error.message.includes("user-not-found") || error.message.includes("wrong-password")) {
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: TOAST_MESSAGES.ERROR.LOGIN.description,
        };
      } else if (error.message.includes("email-already-in-use")) {
        appError = {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: "This email is already registered. Please use a different email or try logging in.",
        };
      } else {
        appError = {
          code: ERROR_CODES.AUTH_REQUIRED,
          message: error.message || TOAST_MESSAGES.ERROR.AUTH.description,
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
 * Show error toast notification
 */
export function showErrorToast(error: unknown, context?: string) {
  const appError = handleError(error, context);
  toast({
    variant: "destructive",
    title: "Error",
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

