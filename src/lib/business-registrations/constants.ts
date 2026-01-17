/**
 * Business Registrations - Constants
 * ICAI-Compliant: Platform-managed delivery
 */

import type { RegistrationType } from './types';

export interface RegistrationConfig {
  id: RegistrationType;
  name: string;
  description: string;
  category: 'essential' | 'business_structure' | 'compliance';
  basePrice: number;
  estimatedDays: number;
  requiredDocuments: string[];
  workflowSteps: string[];
  features: string[];
}

export const REGISTRATION_TYPES: Record<RegistrationType, RegistrationConfig> = {
  gst_registration: {
    id: 'gst_registration',
    name: 'GST Registration',
    description: 'Register for Goods and Services Tax (GST) with GSTN',
    category: 'essential',
    basePrice: 4999,
    estimatedDays: 7,
    requiredDocuments: [
      'PAN Card',
      'Aadhaar Card',
      'Bank Account Details',
      'Proof of Business Address',
      'Digital Signature Certificate (if required)',
      'Photographs',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares application',
      'Application submitted to GSTN',
      'Application processed and GSTIN issued',
      'GSTIN certificate delivered',
    ],
    features: [
      'GSTIN registration',
      'GST certificate',
      'LUT (Letter of Undertaking) assistance',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  pvt_ltd_incorporation: {
    id: 'pvt_ltd_incorporation',
    name: 'Private Limited Company Incorporation',
    description: 'Incorporate a Private Limited Company with MCA',
    category: 'business_structure',
    basePrice: 14999,
    estimatedDays: 15,
    requiredDocuments: [
      'Director PAN Cards',
      'Director Aadhaar Cards',
      'Director Photographs',
      'Proof of Registered Office',
      'No Objection Certificate (NOC) from owner',
      'Digital Signature Certificates (DSC)',
      'Memorandum of Association (MoA)',
      'Articles of Association (AoA)',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares incorporation documents',
      'Name approval from MCA',
      'Application submitted to MCA',
      'Company incorporated and CIN issued',
      'Company documents delivered',
    ],
    features: [
      'Company incorporation',
      'CIN (Corporate Identity Number)',
      'Company PAN & TAN',
      'Certificate of Incorporation',
      'CA review & verification',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  llp_registration: {
    id: 'llp_registration',
    name: 'LLP Registration',
    description: 'Register a Limited Liability Partnership with MCA',
    category: 'business_structure',
    basePrice: 9999,
    estimatedDays: 12,
    requiredDocuments: [
      'Partner PAN Cards',
      'Partner Aadhaar Cards',
      'Partner Photographs',
      'Proof of Registered Office',
      'No Objection Certificate (NOC) from owner',
      'Digital Signature Certificates (DSC)',
      'LLP Agreement',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares LLP documents',
      'Name approval from MCA',
      'Application submitted to MCA',
      'LLP registered and LLPIN issued',
      'LLP documents delivered',
    ],
    features: [
      'LLP registration',
      'LLPIN (LLP Identification Number)',
      'LLP PAN & TAN',
      'Certificate of Incorporation',
      'CA review & verification',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  partnership_firm: {
    id: 'partnership_firm',
    name: 'Partnership Firm Registration',
    description: 'Register a Partnership Firm with Registrar of Firms',
    category: 'business_structure',
    basePrice: 6999,
    estimatedDays: 10,
    requiredDocuments: [
      'Partner PAN Cards',
      'Partner Aadhaar Cards',
      'Partnership Deed',
      'Proof of Business Address',
      'Photographs',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares partnership deed',
      'Partnership deed executed',
      'Application submitted to Registrar of Firms',
      'Partnership firm registered',
      'Registration certificate delivered',
    ],
    features: [
      'Partnership firm registration',
      'Partnership deed preparation',
      'Registration certificate',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  sole_proprietorship_msme: {
    id: 'sole_proprietorship_msme',
    name: 'Sole Proprietorship / MSME (Udyam)',
    description: 'Register as Sole Proprietorship and obtain MSME/Udyam Registration',
    category: 'business_structure',
    basePrice: 2999,
    estimatedDays: 5,
    requiredDocuments: [
      'PAN Card',
      'Aadhaar Card',
      'Bank Account Details',
      'Proof of Business Address',
      'Photograph',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares application',
      'MSME/Udyam registration application submitted',
      'Registration processed and Udyam number issued',
      'Udyam registration certificate delivered',
    ],
    features: [
      'Udyam registration',
      'Udyam registration number',
      'Udyam certificate',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  shops_establishment: {
    id: 'shops_establishment',
    name: 'Shops & Establishment Registration',
    description: 'Register under Shops and Establishment Act',
    category: 'compliance',
    basePrice: 3999,
    estimatedDays: 7,
    requiredDocuments: [
      'Business license',
      'Proof of Business Address',
      'PAN Card',
      'Identity proof',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares application',
      'Application submitted to Labor Department',
      'Registration certificate issued',
      'Certificate delivered',
    ],
    features: [
      'Shops & Establishment registration',
      'Registration certificate',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  professional_tax: {
    id: 'professional_tax',
    name: 'Professional Tax Registration',
    description: 'Register for Professional Tax (state-specific)',
    category: 'compliance',
    basePrice: 1999,
    estimatedDays: 5,
    requiredDocuments: [
      'PAN Card',
      'Proof of Business Address',
      'Bank Account Details',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares application',
      'Application submitted to Commercial Tax Department',
      'Professional Tax registration certificate issued',
      'Certificate delivered',
    ],
    features: [
      'Professional Tax registration',
      'Registration certificate',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
  pf_esi_registration: {
    id: 'pf_esi_registration',
    name: 'PF & ESI Registration',
    description: 'Register for Provident Fund (PF) and Employees State Insurance (ESI)',
    category: 'compliance',
    basePrice: 5999,
    estimatedDays: 10,
    requiredDocuments: [
      'PAN Card',
      'Proof of Business Address',
      'Bank Account Details',
      'Employee details',
      'Company registration certificate (if applicable)',
    ],
    workflowSteps: [
      'Submit required documents',
      'ZenithBooks Compliance Team prepares applications',
      'PF registration application submitted',
      'ESI registration application submitted',
      'PF & ESI registration certificates issued',
      'Certificates delivered',
    ],
    features: [
      'PF registration',
      'ESI registration',
      'PF & ESI certificates',
      'Platform-managed delivery by ZenithBooks Compliance Team',
    ],
  },
};

export const REGISTRATION_IDS = Object.keys(REGISTRATION_TYPES) as RegistrationType[];

export function getRegistrationConfig(type: RegistrationType): RegistrationConfig {
  return REGISTRATION_TYPES[type];
}

export function getAllRegistrations(): RegistrationConfig[] {
  return Object.values(REGISTRATION_TYPES);
}

export function getRegistrationsByCategory(category: RegistrationConfig['category']): RegistrationConfig[] {
  return Object.values(REGISTRATION_TYPES).filter((reg) => reg.category === category);
}

