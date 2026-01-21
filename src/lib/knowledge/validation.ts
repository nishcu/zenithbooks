/**
 * Knowledge Exchange - Content Validation
 * Auto-flagging for promotional content per ICAI guidelines
 */

import { BLOCKED_PATTERNS } from './types';

export interface ValidationResult {
  isValid: boolean;
  blockedPatterns: string[];
  errors: string[];
}

/**
 * Validate content for promotional/solicitation patterns
 */
export function validateKnowledgeContent(
  title: string,
  content: string
): ValidationResult {
  const blockedPatterns: string[] = [];
  const errors: string[] = [];
  
  const fullText = `${title} ${content}`.toLowerCase();
  
  // Check against blocked patterns
  BLOCKED_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(fullText)) {
      const patternNames = [
        'Phone number',
        'Email address',
        'WhatsApp link',
        'Promotional pricing terms',
        'Pricing with contact CTA',
        'Competitive pricing language',
        'Contact CTA',
        'Promotional language',
        'Sales CTA',
      ];
      blockedPatterns.push(patternNames[index] || `Pattern ${index + 1}`);
    }
  });
  
  if (blockedPatterns.length > 0) {
    errors.push(
      'Content contains promotional or solicitation elements: ' +
      blockedPatterns.join(', ')
    );
  }
  
  return {
    isValid: blockedPatterns.length === 0,
    blockedPatterns,
    errors,
  };
}

/**
 * Check if content should be auto-flagged for review
 */
export function shouldAutoFlagForReview(
  title: string,
  content: string,
  sourceReference: string
): boolean {
  // Validate content
  const validation = validateKnowledgeContent(title, content);
  
  // Auto-flag if blocked patterns found
  if (!validation.isValid) {
    return true;
  }
  
  // Auto-flag if source reference is missing
  if (!sourceReference || sourceReference.trim().length < 5) {
    return true;
  }
  
  return false;
}

