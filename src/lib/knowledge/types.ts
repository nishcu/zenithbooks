/**
 * Knowledge Exchange - Types
 * ICAI-Compliant: Education-only, non-promotional content
 */

import { Timestamp } from 'firebase/firestore';

export type KnowledgeCategory = 
  | "GST"
  | "Income Tax"
  | "Company Law"
  | "TDS"
  | "Labour Law"
  | "Case Law"
  | "Circular / Notification"
  | "Templates & Checklists";

export type KnowledgePostStatus = "PUBLISHED" | "UNDER_REVIEW" | "REMOVED";

export interface KnowledgePost {
  id: string;
  title: string;
  content: string; // Rich text, no embeds
  category: KnowledgeCategory;
  authorId: string;
  authorName?: string;
  authorFirmName?: string;
  authorQualification?: string; // CA, CMA, CS, etc.
  sourceReference: string; // Mandatory - Govt circular / Act / Case citation
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  status: KnowledgePostStatus;
  complianceDeclarationAccepted: boolean;
  
  // Engagement (no popularity mechanics)
  helpfulCount?: number; // Only helpful reactions
  savedByUsers?: string[]; // User IDs who saved this
  reportedByUsers?: string[]; // User IDs who reported
  reportReasons?: string[]; // Reasons: Promotional, Misleading, Incorrect
  
  // Moderation
  moderatedBy?: string; // Admin user ID
  moderationNotes?: string;
  removedAt?: Timestamp | Date;
}

export interface KnowledgeReaction {
  id: string;
  postId: string;
  userId: string;
  type: "helpful"; // Only helpful allowed
  createdAt: Timestamp | Date;
}

export interface KnowledgeSave {
  id: string;
  postId: string;
  userId: string;
  createdAt: Timestamp | Date;
}

export interface KnowledgeReport {
  id: string;
  postId: string;
  reportedByUserId: string;
  reason: "Promotional" | "Misleading" | "Incorrect" | "Other";
  details?: string;
  createdAt: Timestamp | Date;
  reviewedBy?: string; // Admin user ID
  reviewedAt?: Timestamp | Date;
  status: "pending" | "reviewed" | "dismissed";
}

// Content validation patterns
export const BLOCKED_PATTERNS = [
  /\b\d{10}\b/, // Phone numbers (10 digits)
  /\b[\w\.-]+@[\w\.-]+\.\w+\b/, // Email addresses
  /whatsapp|wa\.me|wa.me/gi, // WhatsApp links
  /₹|rs\.|rupees|pricing|fee|cost|charge/gi, // Pricing terms
  /contact me|contact us|reach out|hire|engage/gi, // Contact CTAs
  /we provide|our services|best ca|top ca|experienced ca/gi, // Promotional language
  /call now|book now|get quote|free consultation/gi, // Sales CTAs
];

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  "GST",
  "Income Tax",
  "Company Law",
  "TDS",
  "Labour Law",
  "Case Law",
  "Circular / Notification",
  "Templates & Checklists",
];

