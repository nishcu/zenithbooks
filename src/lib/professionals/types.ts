/**
 * Professional Collaboration & Workflow System - Types
 * ICAI-Compliant: Firm-to-firm collaboration only
 */

import { Timestamp } from 'firebase/firestore';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  firmId?: string; // Firm identifier
  firmName?: string;
  fullName: string;
  qualifications: string[];
  skills: string[];
  experience: number; // years
  locations: string[]; // cities/states in India
  isVerified: boolean;
  bio?: string;
  phone?: string;
  email?: string;
  website?: string;
  // REMOVED: rating, totalReviews (public ratings violate ICAI)
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface CollaborationRequest {
  id: string;
  requestedByFirmId: string; // Firm ID of requesting firm
  requestedByFirmName: string;
  requestedByUserId: string; // User ID who created the request
  category: string;
  title: string;
  description: string;
  location: string; // city, state
  state?: string;
  city?: string;
  onSite: boolean;
  // REMOVED: budget (price discovery violates ICAI)
  deadline: Timestamp | Date;
  visibility: 'invite-only' | 'firm-network';
  invitedFirmIds: string[]; // Explicitly invited firms
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  executingFirmId?: string; // Firm ID assigned to execute
  executingFirmName?: string;
  executingUserId?: string; // User ID assigned to execute
  professionalResponsibility: 'requesting_firm'; // ICAI compliance statement
  feeSettlement: 'off-platform'; // ICAI compliance: no platform intermediation
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Legacy alias for backward compatibility during migration
export type TaskPost = CollaborationRequest;

export interface CollaborationInvite {
  id: string;
  requestId: string; // Reference to CollaborationRequest
  invitedFirmId: string; // Firm being invited
  invitedFirmName?: string;
  invitedByFirmId: string; // Firm sending invite
  invitedByFirmName?: string;
  message?: string; // Optional invitation message
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Timestamp | Date;
  respondedAt?: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

// Legacy alias for backward compatibility during migration
export type TaskApplication = CollaborationInvite;

export interface CollaborationChat {
  id: string;
  requestId: string; // Reference to CollaborationRequest
  senderId: string; // User ID
  senderName?: string;
  senderFirmId?: string;
  message: string;
  createdAt: Timestamp | Date;
}

// Legacy alias for backward compatibility during migration
export type TaskChat = CollaborationChat;

export interface InternalQualityFeedback {
  id: string;
  requestId: string; // Reference to completed CollaborationRequest
  givenByFirmId: string; // Firm providing feedback
  givenByFirmName?: string;
  receivedByFirmId: string; // Firm receiving feedback
  receivedByFirmName?: string;
  professionalismScore: number; // 1-5
  timelinessScore: number; // 1-5
  complianceScore: number; // 1-5
  internalNotes?: string; // Private notes
  visibility: 'private'; // Never displayed publicly
  createdAt: Timestamp | Date;
}

// Legacy alias for backward compatibility during migration
export type TaskReview = InternalQualityFeedback;

// Task categories
export const TASK_CATEGORIES = [
  'GST Filing',
  'ITR Filing',
  'Company Registration',
  'Trademark Registration',
  'Audit Services',
  'Tax Planning',
  'Accounting Services',
  'Legal Documentation',
  'Compliance Services',
  'Consultation',
  'Other',
] as const;

export type TaskCategory = typeof TASK_CATEGORIES[number];

// India States
export const INDIA_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
] as const;

export type IndiaState = typeof INDIA_STATES[number];

