/**
 * User-based code prefix utility
 * Generates a unique prefix for each user to prevent code collisions
 */

/**
 * Generate a short user identifier from userId
 * Returns first 6 characters of a hash of the userId
 * Format: Uppercase alphanumeric (e.g., "A3B9C2")
 */
export async function generateUserCodePrefix(userId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(userId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  
  // Take first 6 characters and convert to uppercase
  // Use only alphanumeric characters (0-9, A-F from hex)
  // Map to a wider range for better readability
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding confusing chars
  let prefix = "";
  for (let i = 0; i < 6; i++) {
    const hexChar = hashHex[i];
    const index = parseInt(hexChar, 16); // 0-15
    prefix += chars[index % chars.length];
  }
  
  return prefix;
}

/**
 * Add user prefix to a code
 * Format: "PREFIX-CODE" (e.g., "A3B9C2-SMRAEAFORCA")
 */
export async function addUserPrefixToCode(code: string, userId: string): Promise<string> {
  const prefix = await generateUserCodePrefix(userId);
  return `${prefix}-${code.toUpperCase()}`;
}

/**
 * Extract user prefix from a code
 * Returns { prefix, code } or null if format is invalid
 */
export function extractUserPrefixFromCode(fullCode: string): { prefix: string; code: string } | null {
  const trimmed = fullCode.trim();
  const parts = trimmed.split("-");
  
  if (parts.length < 2) {
    // No prefix - might be old format code
    return null;
  }
  
  // Last part is the actual code, everything before is prefix
  const code = parts[parts.length - 1];
  const prefix = parts.slice(0, -1).join("-");
  
  if (prefix.length < 4 || code.length < 4) {
    return null;
  }
  
  return { prefix, code };
}

/**
 * Validate if a code has the correct user prefix
 */
export async function validateUserPrefix(code: string, userId: string): Promise<boolean> {
  const extracted = extractUserPrefixFromCode(code);
  if (!extracted) {
    return false;
  }
  
  const expectedPrefix = await generateUserCodePrefix(userId);
  return extracted.prefix === expectedPrefix;
}

