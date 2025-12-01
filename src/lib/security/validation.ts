/**
 * Server-side validation utilities
 * Provides validation functions that can be used in API routes and server actions
 */

import { z } from "zod";

/**
 * Common validation schemas
 */
export const validationSchemas = {
  email: z.string().email("Invalid email address").max(255, "Email too long"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  phone: z
    .string()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, "Invalid phone number"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GSTIN format"),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
  aadhaar: z
    .string()
    .regex(/^[0-9]{12}$/, "Invalid Aadhaar number"),
  positiveNumber: z.coerce.number().positive("Must be a positive number"),
  nonNegativeNumber: z.coerce.number().min(0, "Must be a non-negative number"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  url: z.string().url("Invalid URL"),
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/, "Must contain only letters and numbers"),
  text: z.string().min(1, "This field is required").max(10000, "Text too long"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name contains invalid characters"),
};

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== "string") {
    return "";
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, "");

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");

  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, "");

  // Remove iframe tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

  // Remove object and embed tags
  sanitized = sanitized.replace(/<(object|embed)\b[^<]*(?:(?!<\/(object|embed)>)<[^<]*)*<\/(object|embed)>/gi, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === "string") {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === "object" && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]) as any;
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: any) =>
        typeof item === "string" ? sanitizeString(item) : typeof item === "object" ? sanitizeObject(item) : item
      ) as any;
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize input using Zod schema
 */
export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  try {
    // First sanitize if it's an object
    let sanitizedInput = input;
    if (typeof input === "object" && input !== null && !Array.isArray(input)) {
      sanitizedInput = sanitizeObject(input as Record<string, any>);
    } else if (typeof input === "string") {
      sanitizedInput = sanitizeString(input);
    }

    // Then validate
    const result = schema.safeParse(sanitizedInput);

    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  } catch (error) {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: "custom",
          message: "Validation failed",
          path: [],
        },
      ]),
    };
  }
}

/**
 * Rate limiting store (in-memory, for production use Redis or similar)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 100, windowMs: 60000 } // 100 requests per minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  if (!record || record.resetTime < now) {
    // New or expired record
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetTime: record.resetTime };
}

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  return ip;
}

