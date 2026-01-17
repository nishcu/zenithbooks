
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Handshake, Briefcase, Users, Shield, Loader2, CheckCircle, HelpCircle } from "lucide-react";
import { getServicePricing, onPricingUpdate, ServicePricing } from "@/lib/pricing-service";

// Define all documents by category
const documentsByCategory: Record<string, Array<{
  id: string;
  title: string;
  description: string;
  href: string;
  icon: any;
  category: string;
  status?: "available" | "coming_soon";
}>> = {
  agreements: [
    // Employee & HR Agreements (10)
    { id: "employment_agreement", title: "Employment Agreement", description: "Comprehensive employment agreement for full-time employees.", href: "/legal-documents/employment-agreement", icon: Users, category: "agreements", status: "coming_soon" },
    { id: "contractor_agreement", title: "Contractor Agreement", description: "Agreement for engaging independent contractors and freelancers.", href: "/legal-documents/contractor-agreement", icon: Briefcase, category: "agreements", status: "coming_soon" },
    { id: "non_compete_agreement", title: "Non-Compete Agreement", description: "Restrict employees from competing during and after employment.", href: "/legal-documents/non-compete-agreement", icon: Shield, category: "agreements", status: "coming_soon" },
    { id: "non_solicitation_agreement", title: "Non-Solicitation Agreement", description: "Prevent solicitation of clients and employees.", href: "/legal-documents/non-solicitation-agreement", icon: Shield, category: "agreements", status: "coming_soon" },
    { id: "remote_work_policy", title: "Remote Work Policy", description: "Define terms and conditions for remote work arrangements.", href: "/legal-documents/remote-work-policy", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "termination_letter", title: "Termination Letter", description: "Formal termination letter template for employees.", href: "/legal-documents/termination-letter", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "warning_letter", title: "Warning Letter", description: "Official warning letter for employee misconduct or performance issues.", href: "/legal-documents/warning-letter", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "experience_letter", title: "Experience Letter", description: "Generate an experience letter for departing employees.", href: "/legal-documents/experience-letter", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "relieving_letter", title: "Relieving Letter", description: "Formal relieving letter confirming end of employment.", href: "/legal-documents/relieving-letter", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "probation_confirmation", title: "Probation Confirmation Letter", description: "Confirm completion of probation period.", href: "/legal-documents/probation-confirmation", icon: FileText, category: "agreements", status: "coming_soon" },
    // Business & Commercial Agreements (existing + new)
    { id: "sale_of_goods", title: "Sale of Goods Agreement", description: "Agreement for sale and purchase of goods.", href: "/legal-documents/sale-of-goods-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    { id: "distributor_agreement", title: "Distributor Agreement", description: "Establish distribution terms and territories.", href: "/legal-documents/distributor-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    { id: "dealer_agreement", title: "Dealer Agreement", description: "Define dealer relationship and sales terms.", href: "/legal-documents/dealer-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    { id: "marketing_agreement", title: "Marketing Agreement", description: "Agreement for marketing and promotional services.", href: "/legal-documents/marketing-agreement", icon: Briefcase, category: "agreements", status: "coming_soon" },
    { id: "advertising_agreement", title: "Advertising Agreement", description: "Terms for advertising and media placement.", href: "/legal-documents/advertising-agreement", icon: Briefcase, category: "agreements", status: "coming_soon" },
    { id: "influencer_agreement", title: "Influencer Agreement", description: "Agreement with social media influencers and content creators.", href: "/legal-documents/influencer-agreement", icon: Users, category: "agreements", status: "coming_soon" },
    { id: "collaboration_agreement", title: "Collaboration Agreement", description: "Partnership and collaboration terms between businesses.", href: "/legal-documents/collaboration-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    { id: "cofounder_exit", title: "Co-founder Exit Agreement", description: "Formalize exit terms for co-founders leaving the startup.", href: "/legal-documents/cofounder-exit-agreement", icon: Users, category: "agreements", status: "coming_soon" },
    { id: "outsourcing_agreement", title: "Outsourcing Agreement", description: "Terms for outsourcing business processes or services.", href: "/legal-documents/outsourcing-agreement", icon: Briefcase, category: "agreements", status: "coming_soon" },
    { id: "amc_agreement", title: "AMC (Annual Maintenance Contract)", description: "Annual maintenance and support service agreement.", href: "/legal-documents/amc-agreement", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "sla_agreement", title: "SLA (Service Level Agreement)", description: "Define service level expectations and metrics.", href: "/legal-documents/sla-agreement", icon: FileText, category: "agreements", status: "coming_soon" },
    { id: "event_management", title: "Event Management Agreement", description: "Agreement for event planning and management services.", href: "/legal-documents/event-management-agreement", icon: Briefcase, category: "agreements", status: "coming_soon" },
    { id: "sponsorship_agreement", title: "Sponsorship Agreement", description: "Corporate sponsorship terms and conditions.", href: "/legal-documents/sponsorship-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    { id: "brokerage_agreement", title: "Brokerage Agreement", description: "Terms for brokerage and intermediary services.", href: "/legal-documents/brokerage-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    { id: "franchise_renewal", title: "Franchise Renewal Agreement", description: "Renewal terms for existing franchise relationships.", href: "/legal-documents/franchise-renewal-agreement", icon: Handshake, category: "agreements", status: "coming_soon" },
    // Existing agreements
    { id: "nda", title: "NDA (Non-Disclosure Agreement)", description: "Protect sensitive company information.", href: "/legal-documents/nda", icon: Shield, category: "agreements", status: "available" },
    { id: "consultant_agreement", title: "Consultant / Freelancer Agreement", description: "Define terms for engaging independent contractors.", href: "/legal-documents/consultant-agreement", icon: Briefcase, category: "agreements", status: "available" },
    { id: "vendor_agreement", title: "Vendor Agreement", description: "Set terms with your suppliers and vendors.", href: "/legal-documents/vendor-agreement", icon: Briefcase, category: "agreements", status: "available" },
    { id: "service_agreement", title: "Service Agreement", description: "A general-purpose agreement for providing services.", href: "/legal-documents/service-agreement", icon: Briefcase, category: "agreements", status: "available" },
    { id: "franchise_agreement", title: "Franchise Agreement", description: "Establish the terms of a franchise relationship.", href: "/legal-documents/franchise-agreement", icon: Handshake, category: "agreements", status: "available" },
    { id: "loan_agreement", title: "Loan Agreement", description: "Between partners/directors & the company.", href: "/legal-documents/loan-agreement", icon: FileText, category: "agreements", status: "available" },
    { id: "rental_deed", title: "Rental Deed", description: "Draft a legal agreement for property rental.", href: "/legal-documents/rental-deed", icon: FileText, category: "agreements", status: "available" },
    { id: "lease_deed", title: "Lease Deed", description: "Create a formal lease agreement for long-term property usage.", href: "/legal-documents/lease-deed", icon: FileText, category: "agreements", status: "available" },
  ],
  registration: [
    { id: "gst_lut", title: "GST LUT (Letter of Undertaking)", description: "Generate LUT for export without payment of IGST.", href: "/legal-documents/gst-lut", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "shop_establishment", title: "Shop & Establishment Registration Draft", description: "Draft application for Shop & Establishment Act registration.", href: "/legal-documents/shop-establishment", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "udyam_registration", title: "Udyam Registration Draft", description: "Support documents for MSME/Udyam registration.", href: "/legal-documents/udyam-registration", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "iec_registration", title: "Import Export Code (IEC) Draft", description: "Application draft for IEC registration.", href: "/legal-documents/iec-registration", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "fssai_registration", title: "FSSAI Registration Draft", description: "Food Safety registration application documents.", href: "/legal-documents/fssai-registration", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "msme_certificate_support", title: "MSME Certificate Support Documents", description: "Supporting documents for MSME certification.", href: "/legal-documents/msme-certificate-support", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "trademark_authorization", title: "Trademark Registration Authorization Letter", description: "Authorize agent for trademark registration.", href: "/legal-documents/trademark-authorization", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "dir2_consent", title: "DIR-2 Director Consent", description: "Consent to act as director form (DIR-2).", href: "/legal-documents/dir2-consent", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "pan_tan_authorization", title: "PAN / TAN Application Authorization", description: "Authorize representative for PAN/TAN applications.", href: "/legal-documents/pan-tan-authorization", icon: FileText, category: "registration", status: "coming_soon" },
    { id: "bank_account_resolution", title: "Bank Account Opening Resolution", description: "Board resolution for opening bank account.", href: "/legal-documents/bank-account-resolution", icon: FileText, category: "registration", status: "coming_soon" },
  ],
  "company-law": [
    { id: "inc9", title: "INC-9", description: "Declaration by subscribers and first directors.", href: "/legal-documents/inc9", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "dir8", title: "DIR-8", description: "Intimation of interest by director.", href: "/legal-documents/dir8", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "declaration_subscribers", title: "Declaration by Subscribers", description: "Initial declaration for company formation.", href: "/legal-documents/declaration-subscribers", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "declaration_director", title: "Declaration of Director", description: "Director eligibility and compliance declaration.", href: "/legal-documents/declaration-director", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "auditor_consent", title: "Consent to Act as Auditor", description: "Auditor's consent letter for appointment.", href: "/legal-documents/auditor-consent", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "share_subscription", title: "Share Subscription Letter", description: "Letter for subscribing to company shares.", href: "/legal-documents/share-subscription", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "first_board_minutes", title: "First Board Meeting Minutes", description: "Minutes template for first board meeting.", href: "/legal-documents/first-board-minutes", icon: FileText, category: "company-law", status: "coming_soon" },
    // Board Resolutions
    { id: "allotment_shares", title: "Allotment of Shares Resolution", description: "Board resolution for share allotment.", href: "/legal-documents/board-resolutions/allotment-shares", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "increase_capital", title: "Increase in Authorised Capital", description: "Resolution to increase authorized capital.", href: "/legal-documents/board-resolutions/increase-capital", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "change_directors", title: "Change in Directors Resolution", description: "Appointment/removal of directors.", href: "/legal-documents/board-resolutions/change-directors", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "removal_director", title: "Removal of Director Resolution", description: "Board resolution for director removal.", href: "/legal-documents/board-resolutions/removal-director", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "closure_bank_account", title: "Closure of Bank Account Resolution", description: "Resolution to close company bank account.", href: "/legal-documents/board-resolutions/closure-bank-account", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "share_transfer", title: "Share Transfer Approval Resolution", description: "Board approval for share transfer.", href: "/legal-documents/board-resolutions/share-transfer", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "related_party_transaction", title: "Related Party Transaction Approval", description: "Resolution for related party transactions.", href: "/legal-documents/board-resolutions/related-party-transaction", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "internal_auditor", title: "Appointment of Internal Auditor", description: "Resolution to appoint internal auditor.", href: "/legal-documents/board-resolutions/internal-auditor", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "branch_office", title: "Opening Branch Office Resolution", description: "Resolution for opening branch office.", href: "/legal-documents/board-resolutions/branch-office", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "adopt_moa_aoa", title: "Adoption of New MOA/AOA", description: "Resolution to adopt amended MOA/AOA.", href: "/legal-documents/board-resolutions/adopt-moa-aoa", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "issue_debentures", title: "Issue of Debentures Resolution", description: "Board resolution for debenture issuance.", href: "/legal-documents/board-resolutions/issue-debentures", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "loan_to_equity", title: "Conversion of Loan into Equity", description: "Resolution for loan to equity conversion.", href: "/legal-documents/board-resolutions/loan-to-equity", icon: FileText, category: "company-law", status: "coming_soon" },
    { id: "esop_grant_approval", title: "ESOP Grant Approval Resolution", description: "Board approval for ESOP grant.", href: "/legal-documents/board-resolutions/esop-grant-approval", icon: FileText, category: "company-law", status: "coming_soon" },
    // Existing
    { id: "board_resolutions", title: "Board Resolutions Library", description: "Templates for common board resolutions.", href: "/legal-documents/board-resolutions", icon: FileText, category: "company-law", status: "available" },
    { id: "moa_aoa", title: "MOA & AOA", description: "Memorandum and Articles of Association for companies.", href: "/legal-documents/moa-aoa", icon: FileText, category: "company-law", status: "available" },
    { id: "statutory_registers", title: "Statutory Registers (Co. Act)", description: "Generate mandatory statutory registers for your company.", href: "/legal-documents/statutory-registers", icon: FileText, category: "company-law", status: "available" },
  ],
  tax: [
    // GST Documents
    { id: "gst_revocation_request", title: "GST Revocation Request Letter", description: "Request revocation of cancelled GST registration.", href: "/legal-documents/gst-revocation-request", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "gst_refund_support", title: "GST Refund Supporting Documents", description: "Supporting documents for GST refund claims.", href: "/legal-documents/gst-refund-support", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "gst_composition_declaration", title: "GST Composition Declaration", description: "Declaration for composition scheme.", href: "/legal-documents/gst-composition-declaration", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "gst_amendment_application", title: "GST Amendment Application Docs", description: "Documents for GST registration amendment.", href: "/legal-documents/gst-amendment-application", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "gst_cancellation_authorization", title: "GST Cancellation Authorization", description: "Authorize representative for GST cancellation.", href: "/legal-documents/gst-cancellation-authorization", icon: FileText, category: "tax", status: "coming_soon" },
    // Income Tax
    { id: "tds_nondeduction_15g", title: "TDS Non-Deduction Declaration (15G/15H)", description: "Auto-fill Form 15G/15H for TDS exemption.", href: "/legal-documents/tds-nondeduction-15g", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "salary_structure_letter", title: "Salary Structure Letter", description: "Generate salary structure breakdown letter.", href: "/legal-documents/salary-structure-letter", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "income_tax_notice_reply", title: "Income Tax Notice Reply Draft", description: "Draft reply to income tax notices.", href: "/legal-documents/income-tax-notice-reply", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "rectification_request", title: "Rectification Request Draft", description: "Request for rectification of mistakes.", href: "/legal-documents/rectification-request", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "revised_return_ack", title: "Revised Return Acknowledgment Format", description: "Format for revised return acknowledgment.", href: "/legal-documents/revised-return-ack", icon: FileText, category: "tax", status: "coming_soon" },
    // Professional Tax
    { id: "pt_registration", title: "PT Registration Draft", description: "Application for Professional Tax registration.", href: "/legal-documents/pt-registration", icon: FileText, category: "tax", status: "coming_soon" },
    { id: "pt_payment_challan", title: "PT Payment Challan Auto Draft", description: "Generate PT payment challan.", href: "/legal-documents/pt-payment-challan", icon: FileText, category: "tax", status: "coming_soon" },
    // Existing
    { id: "self_affidavit_gst", title: "Self Affidavit for GST", description: "Generate a self-declaration affidavit for GST registration.", href: "/legal-documents/self-affidavit-gst", icon: FileText, category: "tax", status: "available" },
    { id: "gst_engagement_letter", title: "GST Engagement Letter", description: "Between a client and a tax consultant.", href: "/legal-documents/gst-engagement-letter", icon: FileText, category: "tax", status: "available" },
  ],
  "startup-funding": [
    { id: "investor_pitch_nda", title: "Investor Pitch NDA", description: "NDA for investor pitch presentations.", href: "/legal-documents/investor-pitch-nda", icon: Shield, category: "startup-funding", status: "coming_soon" },
    { id: "term_sheet", title: "Term Sheet", description: "Investment term sheet template.", href: "/legal-documents/term-sheet", icon: FileText, category: "startup-funding", status: "coming_soon" },
    { id: "equity_investment_agreement", title: "Equity Investment Agreement", description: "Agreement for equity investment rounds.", href: "/legal-documents/equity-investment-agreement", icon: Handshake, category: "startup-funding", status: "coming_soon" },
    { id: "cap_table_document", title: "Cap Table Document", description: "Capitalization table template.", href: "/legal-documents/cap-table", icon: FileText, category: "startup-funding", status: "coming_soon" },
    { id: "due_diligence_checklist", title: "Due Diligence Checklist", description: "Comprehensive due diligence checklist.", href: "/legal-documents/due-diligence-checklist", icon: FileText, category: "startup-funding", status: "coming_soon" },
    { id: "startup_valuation_report", title: "Startup Valuation Report Template", description: "Template for startup valuation reports.", href: "/legal-documents/startup-valuation-report", icon: FileText, category: "startup-funding", status: "coming_soon" },
    { id: "angel_investment_agreement", title: "Angel Investment Agreement", description: "Agreement for angel investor funding.", href: "/legal-documents/angel-investment-agreement", icon: Handshake, category: "startup-funding", status: "coming_soon" },
    { id: "founders_vesting_agreement", title: "Founders Vesting Agreement", description: "Vesting schedule for founder shares.", href: "/legal-documents/founders-vesting-agreement", icon: Users, category: "startup-funding", status: "coming_soon" },
    { id: "esop_grant_letter", title: "ESOP Grant Letter", description: "Letter for granting employee stock options.", href: "/legal-documents/esop-grant-letter", icon: FileText, category: "startup-funding", status: "coming_soon" },
    { id: "vesting_schedule_template", title: "Vesting Schedule Template", description: "Template for vesting schedules.", href: "/legal-documents/vesting-schedule", icon: FileText, category: "startup-funding", status: "coming_soon" },
    // Existing
    { id: "founders_agreement", title: "Founders' Agreement", description: "Essential legal document for startup co-founders.", href: "/legal-documents/founders-agreement", icon: Handshake, category: "startup-funding", status: "available" },
    { id: "shareholders_agreement", title: "Shareholders' Agreement (SHA)", description: "Define rights and obligations of shareholders.", href: "/legal-documents/shareholders-agreement", icon: Users, category: "startup-funding", status: "available" },
    { id: "esop_policy", title: "ESOP Trust Deed / Policy", description: "Establish an Employee Stock Option Plan.", href: "/legal-documents/esop-policy", icon: FileText, category: "startup-funding", status: "available" },
    { id: "safe_agreement", title: "Convertible Note / SAFE Agreement", description: "For early-stage startup fundraising.", href: "/legal-documents/safe-agreement", icon: FileText, category: "startup-funding", status: "available" },
  ],
  "finance-banking": [
    { id: "bank_loan_application", title: "Bank Loan Application Template", description: "Comprehensive loan application template.", href: "/legal-documents/bank-loan-application", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "cash_flow_projection", title: "Cash Flow Projection Format", description: "Template for cash flow projections.", href: "/legal-documents/cash-flow-projection", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "cma_data", title: "CMA Data (Credit Monitoring Arrangement)", description: "CMA data format for bank credit facilities.", href: "/legal-documents/cma-data", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "working_capital_assessment", title: "Working Capital Assessment Document", description: "Assessment document for working capital loan.", href: "/legal-documents/working-capital-assessment", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "dscr_calculation", title: "DSCR Calculation Sheet", description: "Debt Service Coverage Ratio calculation template.", href: "/legal-documents/dscr-calculation", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "emi_calculator_report", title: "EMI Calculator Report", description: "Loan EMI calculation and amortization report.", href: "/legal-documents/emi-calculator-report", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "bank_statement_analysis", title: "Bank Statement Analysis Report", description: "Template for analyzing bank statements.", href: "/legal-documents/bank-statement-analysis", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "project_report_pdf", title: "Project Report PDF Generator", description: "Generate detailed project reports for loans.", href: "/legal-documents/project-report-pdf", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "stock_statement_monthly", title: "Stock Statement (Monthly)", description: "Monthly stock statement format for banks.", href: "/legal-documents/stock-statement-monthly", icon: FileText, category: "finance-banking", status: "coming_soon" },
    { id: "debtors_creditors_aging", title: "Debtors / Creditors Aging Certificate", description: "Aging analysis certificate for bank compliance.", href: "/legal-documents/debtors-creditors-aging", icon: FileText, category: "finance-banking", status: "coming_soon" },
  ],
  "hr-policies": [
    { id: "hr_policy_handbook", title: "HR Policy Handbook", description: "Comprehensive employee handbook template.", href: "/legal-documents/hr-policy-handbook", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "leave_policy", title: "Leave Policy", description: "Employee leave policy template.", href: "/legal-documents/leave-policy", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "attendance_working_hours", title: "Attendance & Working Hours Policy", description: "Define attendance and working hour policies.", href: "/legal-documents/attendance-working-hours-policy", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "bonus_gratuity_policy", title: "Bonus & Gratuity Policy", description: "Policy for bonus and gratuity payments.", href: "/legal-documents/bonus-gratuity-policy", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "anti_harassment_policy", title: "Anti-Harassment Policy", description: "Prevention of sexual harassment policy.", href: "/legal-documents/anti-harassment-policy", icon: Shield, category: "hr-policies", status: "coming_soon" },
    { id: "employee_reimbursement", title: "Employee Reimbursement Policy", description: "Policy for expense reimbursements.", href: "/legal-documents/employee-reimbursement-policy", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "remote_work_policy_hr", title: "Remote Work Policy", description: "Define terms for remote work arrangements.", href: "/legal-documents/remote-work-policy-hr", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "code_of_conduct", title: "Code of Conduct", description: "Employee code of conduct and ethics policy.", href: "/legal-documents/code-of-conduct", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "it_security_policy", title: "IT Security Policy", description: "Information technology security and usage policy.", href: "/legal-documents/it-security-policy", icon: Shield, category: "hr-policies", status: "coming_soon" },
    { id: "expense_policy", title: "Expense Policy", description: "Employee expense and reimbursement policy.", href: "/legal-documents/expense-policy", icon: FileText, category: "hr-policies", status: "coming_soon" },
    { id: "travel_policy", title: "Travel Policy", description: "Business travel and accommodation policy.", href: "/legal-documents/travel-policy", icon: FileText, category: "hr-policies", status: "coming_soon" },
    // Existing
    { id: "offer_letter", title: "Offer Letter", description: "Generate a formal job offer for prospective employees.", href: "/legal-documents/offer-letter", icon: FileText, category: "hr-policies", status: "available" },
    { id: "appointment_letter", title: "Appointment Letter", description: "Create a detailed appointment letter for new hires.", href: "/legal-documents/appointment-letter", icon: FileText, category: "hr-policies", status: "available" },
    { id: "internship_agreement", title: "Internship Agreement", description: "Define the terms and conditions for an internship.", href: "/legal-documents/internship-agreement", icon: FileText, category: "hr-policies", status: "available" },
    { id: "rental_receipt_hra", title: "Rental Receipt for HRA", description: "Generate a rental receipt for HRA claims.", href: "/legal-documents/rental-receipt", icon: FileText, category: "hr-policies", status: "available" },
  ],
  others: [
    { id: "affidavit_general", title: "Affidavit (General)", description: "General purpose affidavit template.", href: "/legal-documents/affidavit-general", icon: FileText, category: "others", status: "coming_soon" },
    { id: "affidavit_name_change", title: "Name Change Affidavit", description: "Affidavit for name change applications.", href: "/legal-documents/affidavit-name-change", icon: FileText, category: "others", status: "coming_soon" },
    { id: "affidavit_address_proof", title: "Address Proof Affidavit", description: "Affidavit for address proof purposes.", href: "/legal-documents/affidavit-address-proof", icon: FileText, category: "others", status: "coming_soon" },
    { id: "affidavit_loss_of_docs", title: "Loss of Documents Affidavit", description: "Affidavit for lost documents.", href: "/legal-documents/affidavit-loss-docs", icon: FileText, category: "others", status: "coming_soon" },
    { id: "indemnity_bond", title: "Indemnity Bond", description: "Indemnity bond template for various purposes.", href: "/legal-documents/indemnity-bond", icon: FileText, category: "others", status: "coming_soon" },
    { id: "power_of_attorney_general", title: "Power of Attorney (General)", description: "General power of attorney template.", href: "/legal-documents/power-of-attorney-general", icon: FileText, category: "others", status: "coming_soon" },
    { id: "power_of_attorney_specific", title: "Power of Attorney (Specific)", description: "Specific purpose power of attorney.", href: "/legal-documents/power-of-attorney-specific", icon: FileText, category: "others", status: "coming_soon" },
    { id: "undertaking_letter", title: "Undertaking Letter", description: "General undertaking letter template.", href: "/legal-documents/undertaking-letter", icon: FileText, category: "others", status: "coming_soon" },
    { id: "vendor_onboarding_kyc", title: "Vendor Onboarding KYC Sheet", description: "KYC form for vendor onboarding.", href: "/legal-documents/vendor-onboarding-kyc", icon: FileText, category: "others", status: "coming_soon" },
    { id: "invoice_format", title: "Invoice Format", description: "Professional invoice template.", href: "/legal-documents/invoice-format", icon: FileText, category: "others", status: "coming_soon" },
    { id: "purchase_order_format", title: "Purchase Order Format", description: "Standard purchase order template.", href: "/legal-documents/purchase-order-format", icon: FileText, category: "others", status: "coming_soon" },
    { id: "delivery_note", title: "Delivery Note", description: "Delivery note/challan template.", href: "/legal-documents/delivery-note", icon: FileText, category: "others", status: "coming_soon" },
    { id: "debit_credit_note", title: "Debit / Credit Note Format", description: "Debit and credit note templates.", href: "/legal-documents/debit-credit-note", icon: FileText, category: "others", status: "coming_soon" },
    { id: "partnership_dissolution", title: "Partnership Dissolution Deed", description: "Deed for dissolving a partnership.", href: "/legal-documents/partnership-dissolution", icon: Handshake, category: "others", status: "coming_soon" },
    { id: "retirement_deed", title: "Retirement Deed", description: "Deed for partner retirement from firm.", href: "/legal-documents/retirement-deed", icon: FileText, category: "others", status: "coming_soon" },
    { id: "gift_deed", title: "Gift Deed", description: "Legal deed for gifting property/assets.", href: "/legal-documents/gift-deed", icon: FileText, category: "others", status: "coming_soon" },
    { id: "will_draft", title: "Will Draft", description: "Last will and testament template.", href: "/legal-documents/will-draft", icon: FileText, category: "others", status: "coming_soon" },
    { id: "amendment_agreement", title: "Amendment Agreement", description: "Agreement to amend existing contracts.", href: "/legal-documents/amendment-agreement", icon: FileText, category: "others", status: "coming_soon" },
    // Existing
    { id: "partnership_deed", title: "Partnership Deed", description: "Create a legal document to form a business partnership.", href: "/legal-documents/partnership-deed", icon: Handshake, category: "others", status: "available" },
    { id: "llp_agreement", title: "LLP Agreement", description: "Draft an agreement for a Limited Liability Partnership.", href: "/legal-documents/llp-agreement", icon: Handshake, category: "others", status: "available" },
    { id: "society_deed", title: "Society Registration Deed", description: "Register a new society with a formal deed.", href: "/legal-documents/society-registration-deed", icon: Users, category: "others", status: "available" },
    { id: "trust_deed", title: "Trust Deed", description: "Formally establish a trust with a legal deed.", href: "/legal-documents/trust-deed", icon: Handshake, category: "others", status: "available" },
    { id: "accounting_engagement_letter", title: "Accounting Engagement Letter", description: "Formalize the terms of accounting services.", href: "/legal-documents/accounting-engagement-letter", icon: FileText, category: "others", status: "available" },
  ],
};

const categoryMetadata: Record<string, { title: string; description: string }> = {
  agreements: { title: "Agreements", description: "Employee & HR agreements, Business & Commercial agreements" },
  registration: { title: "Registration Documents", description: "GST, Shop & Establishment, Udyam, IEC, FSSAI, and more" },
  "company-law": { title: "Company Law Documents", description: "Incorporation documents, Board resolutions, Statutory filings" },
  tax: { title: "Tax Documents", description: "GST, Income Tax, Professional Tax documents and forms" },
  "startup-funding": { title: "Startup & Funding Documents", description: "Term sheets, Investment agreements, ESOP, Due diligence" },
  "finance-banking": { title: "Finance & Banking Documents", description: "Loan applications, CMA data, Projections, Bank documents" },
  "hr-policies": { title: "HR Policies", description: "Employee handbooks, Policies, Code of conduct" },
  others: { title: "Others", description: "Affidavits, POA, Undertakings, Invoices, Purchase Orders" },
};

export default function DocumentCategoryPage() {
  const params = useParams();
  const category = params.category as string;
  const [pricing, setPricing] = useState<ServicePricing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getServicePricing().then(pricingData => {
      setPricing(pricingData);
      setIsLoading(false);
    });

    const unsubscribe = onPricingUpdate(setPricing);
    return () => unsubscribe();
  }, []);

  const getPrice = (id: string, category: string) => {
    if (!pricing) return 0;
    const services = pricing[category as keyof ServicePricing] || [];
    const service = services.find(s => s.id === id);
    return service?.price || 0;
  }

  const documents = documentsByCategory[category] || [];
  const metadata = categoryMetadata[category] || { title: category, description: "" };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link href="/legal-documents" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Document Categories
      </Link>

      <div className="text-center">
        <h1 className="text-3xl font-bold">{metadata.title}</h1>
        <p className="mt-2 max-w-2xl mx-auto text-muted-foreground">
          {metadata.description}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => {
          const price = getPrice(doc.id, doc.category);
          const isAvailable = doc.status === "available";
          
          return (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <doc.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{doc.title}</CardTitle>
                </div>
                <CardDescription>{doc.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex gap-2">
                  {isAvailable ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Coming Soon
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="mt-auto">
                {isAvailable ? (
                  <Link href={doc.href} passHref className="w-full">
                    <Button className="w-full">
                      Start Drafting {price > 0 ? `- ₹${price}` : ''}
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" disabled>
                    Coming Soon
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> Draft provided for general business use. Certification or attestation, where required, is performed by qualified professionals.
        </p>
      </div>
    </div>
  );
}

