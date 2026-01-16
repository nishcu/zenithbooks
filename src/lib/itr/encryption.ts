/**
 * ITR Credentials Encryption Utilities
 * AES-256 encryption for sensitive credentials
 * Only decryptable server-side by CA_TEAM
 * 
 * NOTE: This file should only be used in server-side code (API routes, server actions)
 * For client-side, use the encryption API endpoints
 */

// This will only work in Node.js environment (server-side)
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Get encryption key from environment variable
// In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
function getEncryptionKey(): Buffer {
  const key = process.env.ITR_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ITR_ENCRYPTION_KEY environment variable is not set');
  }
  
  // If key is hex string, convert to buffer
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  
  // Otherwise, derive key from string using PBKDF2
  return crypto.pbkdf2Sync(key, 'zenithbooks-itr-salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt sensitive data (username/password)
 */
export function encryptCredential(plaintext: string): string {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Invalid plaintext provided');
    }

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine: salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error: any) {
    console.error('Encryption error:', error);
    
    // Preserve original error message if it's informative
    if (error.message?.includes('ITR_ENCRYPTION_KEY')) {
      throw error; // Re-throw with original message
    }
    
    throw new Error(`Failed to encrypt credential: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data (server-side only, CA_TEAM role required)
 */
export function decryptCredential(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credential');
  }
}

/**
 * Mask credential for UI display
 */
export function maskCredential(credential: string, showChars: number = 2): string {
  if (!credential || credential.length <= showChars) {
    return '****';
  }
  
  const visible = credential.substring(0, showChars);
  const masked = '*'.repeat(Math.max(4, credential.length - showChars));
  
  return `${visible}${masked}`;
}

/**
 * Validate PAN format
 */
export function validatePAN(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
}

/**
 * Format PAN for display
 */
export function formatPAN(pan: string): string {
  const cleaned = pan.toUpperCase().replace(/\s/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.substring(0, 5)}${cleaned.substring(5, 9)}${cleaned.substring(9)}`;
  }
  return cleaned;
}

