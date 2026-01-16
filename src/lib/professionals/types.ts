/**
 * Professional Networking & Task Assignment System - Types
 * Isolated module - does not modify existing code
 */

import { Timestamp } from 'firebase/firestore';

export interface ProfessionalProfile {
  id: string;
  userId: string;
  fullName: string;
  firmName?: string;
  qualifications: string[];
  skills: string[];
  experience: number; // years
  locations: string[]; // cities/states in India
  isVerified: boolean;
  bio?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  totalReviews?: number;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface TaskPost {
  id: string;
  postedBy: string; // userId
  postedByName?: string;
  category: string;
  title: string;
  description: string;
  location: string; // city, state
  state?: string;
  city?: string;
  onSite: boolean;
  budget?: number;
  deadline: Timestamp | Date;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  assignedTo?: string; // professional userId
  assignedToName?: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface TaskApplication {
  id: string;
  taskId: string;
  applicantId: string;
  applicantName?: string;
  message?: string;
  bidAmount?: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface TaskChat {
  id: string;
  taskId: string;
  senderId: string;
  senderName?: string;
  message: string;
  createdAt: Timestamp | Date;
}

export interface TaskReview {
  id: string;
  taskId: string;
  reviewerId: string; // who is reviewing
  reviewerName?: string;
  professionalId: string; // who is being reviewed
  professionalName?: string;
  rating: number; // 1-5
  comment: string;
  createdAt: Timestamp | Date;
}

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

