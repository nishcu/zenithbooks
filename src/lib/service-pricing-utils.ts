/**
 * Utility functions for determining service pricing based on user type and subscription
 * 
 * Rules:
 * - Professionals with Professional subscription: FREE for CA certificates, legal documents, notice handling, and CMA reports
 * - Business users with any subscription: PAY for all services (CA certificates, legal documents, notice handling, CMA reports)
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface UserSubscriptionInfo {
  userType: "business" | "professional" | null;
  subscriptionPlan: "freemium" | "business" | "professional" | null;
  subscriptionStatus?: string;
}

/**
 * Fetches user subscription information from Firestore
 */
export async function getUserSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo> {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        userType: userData.userType || null,
        subscriptionPlan: userData.subscriptionPlan || null,
        subscriptionStatus: userData.subscriptionStatus || null,
      };
    }
    
    return {
      userType: null,
      subscriptionPlan: null,
    };
  } catch (error) {
    console.error("Error fetching user subscription info:", error);
    return {
      userType: null,
      subscriptionPlan: null,
    };
  }
}

/**
 * Determines if a service should be free for the user
 * 
 * Services that are free for professionals:
 * - CA Certificates
 * - Legal Documents (all categories: agreements, registration_deeds, founder_startup, hr_documents, company_documents, gst_documents, accounting_documents)
 * - Notice Handling
 * - CMA Reports
 * 
 * @param userType - The user's type (business or professional)
 * @param subscriptionPlan - The user's subscription plan
 * @param serviceCategory - The category of service
 * @returns true if the service should be free, false otherwise
 */
export function isServiceFreeForUser(
  userType: "business" | "professional" | null,
  subscriptionPlan: "freemium" | "business" | "professional" | null,
  serviceCategory: "ca_certs" | "legal_documents" | "notice_handling" | "reports" | "agreements" | "registration_deeds" | "founder_startup" | "hr_documents" | "company_documents" | "gst_documents" | "accounting_documents" | "itr_filing"
): boolean {
  // Only professionals with professional subscription get free services
  if (userType === "professional" && subscriptionPlan === "professional") {
    // All legal document categories are free for professionals
    const legalDocumentCategories = ["agreements", "registration_deeds", "founder_startup", "hr_documents", "company_documents", "gst_documents", "accounting_documents"];
    if (serviceCategory === "ca_certs" || 
        serviceCategory === "notice_handling" || 
        serviceCategory === "reports" ||
        legalDocumentCategories.includes(serviceCategory)) {
      return true;
    }
  }
  
  // Business users always pay, even with subscription
  return false;
}

/**
 * Calculates the effective price for a service based on user subscription
 * 
 * @param basePrice - The base price of the service
 * @param userType - The user's type
 * @param subscriptionPlan - The user's subscription plan
 * @param serviceCategory - The category of service
 * @returns The price the user should pay (0 if free, otherwise basePrice)
 */
export function getEffectiveServicePrice(
  basePrice: number,
  userType: "business" | "professional" | null,
  subscriptionPlan: "freemium" | "business" | "professional" | null,
  serviceCategory: "ca_certs" | "legal_documents" | "notice_handling" | "reports" | "agreements" | "registration_deeds" | "founder_startup" | "hr_documents" | "company_documents" | "gst_documents" | "accounting_documents" | "itr_filing"
): number {
  if (isServiceFreeForUser(userType, subscriptionPlan, serviceCategory)) {
    return 0;
  }
  return basePrice;
}

