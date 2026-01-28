
import { getServicePricing, onPricingUpdate } from './pricing-service';

// The shape of our pricing data
type Service = {
    id: string;
    name: string;
    price: number;
};

export type ServicePricing = {
    reports: Service[];
    ca_certs: Service[];
    registration_deeds: Service[];
    founder_startup: Service[];
    agreements: Service[];
    hr_documents: Service[];
    company_documents: Service[];
    gst_documents: Service[];
    accounting_documents: Service[];
    notice_handling: Service[];
    itr_filing: Service[];
    compliance_plans: Service[];
};

// We can still keep the initial default values here
export const servicePricing: ServicePricing = {
    reports: [
        { id: "cma_report", name: "CMA Report", price: 4999 },
        { id: "sales_analysis", name: "Sales Analysis", price: 999 },
        { id: "purchase_analysis", name: "Purchase Analysis", price: 999 },
        // Income Tax
        // Individual Form 16 is paid by default. The app grants 1 free generation per account (freemium).
        { id: "form16_individual", name: "Form 16 Generation (Individual)", price: 499 },
        { id: "form16_bulk", name: "Form 16 Generation (Bulk)", price: 1999 },
    ],
    ca_certs: [
        { id: "net_worth", name: "Net Worth Certificate", price: 2499 },
        { id: "turnover", name: "Turnover Certificate", price: 1999 },
        { id: "capital_contribution", name: "Capital Contribution Certificate", price: 2999 },
        { id: "visa_immigration", name: "Certificate for Visa/Immigration", price: 3499 },
        { id: "foreign_remittance", name: "Foreign Remittance (Form 15CA/CB)", price: 3999 },
        { id: "general_attestation", name: "General Attestation", price: 1499 },
        // New certificates - all default to ₹999
        { id: "projected_financials", name: "Projected Financial Statement Certificate", price: 999 },
        { id: "projected_turnover", name: "Projected Turnover Certificate", price: 999 },
        { id: "net_profit", name: "Net Profit Certificate", price: 999 },
        { id: "shareholding", name: "Shareholding Certificate", price: 999 },
        { id: "sources_of_funds", name: "Certificate of Sources of Funds", price: 999 },
        { id: "utilisation_of_funds", name: "Certificate of Utilisation of Funds", price: 999 },
        { id: "working_capital", name: "Working Capital Certificate", price: 999 },
        { id: "turnover_reconciliation", name: "Turnover Reconciliation Certificate", price: 999 },
        { id: "income_certificate", name: "Income Certificate (CA Issued)", price: 999 },
        { id: "msme_investment_turnover", name: "MSME Investment & Turnover Certificate", price: 999 },
        { id: "iecode_financials", name: "Import-Export (IE Code) Financial Certificate", price: 999 },
    ],
    notice_handling: [
        { id: "income_tax_notice", name: "Income Tax Notice Reply", price: 2999 },
        { id: "gst_notice", name: "GST Notice Reply", price: 2999 },
        { id: "roc_notice", name: "ROC/MCA Notice Reply", price: 3999 },
    ],
    registration_deeds: [
        { id: "partnership_deed", name: "Partnership Deed Registration", price: 4999 },
        { id: "llp_agreement", name: "LLP Agreement", price: 6999 },
        { id: "trust_deed", name: "Trust Deed Registration", price: 9999 },
        { id: "society_deed", name: "Society Registration Deed", price: 14999 },
        { id: "rental_deed", name: "Rental Deed", price: 2999 },
        { id: "lease_deed", name: "Lease Deed", price: 7999 },
    ],
    founder_startup: [
        { id: "founders_agreement", name: "Founders\' Agreement", price: 9999 },
        { id: "shareholders_agreement", name: "Shareholders\' Agreement", price: 14999 },
        { id: "esop_policy", name: "ESOP Policy", price: 19999 },
        { id: "safe_agreement", name: "SAFE Agreement", price: 7999 },
        { id: "moa_aoa", name: "Memorandum & Articles of Association", price: 4999 },
    ],
    agreements: [
        { id: "service_agreement", name: "Service Agreement", price: 3999 },
        { id: "vendor_agreement", name: "Vendor Agreement", price: 3999 },
        { id: "consultant_agreement", name: "Consultant Agreement", price: 3999 },
        { id: "franchise_agreement", name: "Franchise Agreement", price: 12999 },
        { id: "loan_agreement", name: "Loan Agreement", price: 2999 },
        { id: "nda", name: "Non-Disclosure Agreement (NDA)", price: 2499 },
    ],
    hr_documents: [
        { id: "appointment_letter", name: "Appointment Letter", price: 999 },
        { id: "offer_letter", name: "Offer Letter", price: 499 },
        { id: "internship_agreement", name: "Internship Agreement", price: 1499 },
        { id: "rental_receipt_hra", name: "Rental Receipt for HRA", price: 499 },
    ],
    company_documents: [
        { id: "board_resolutions", name: "Board Resolutions", price: 1999 },
        { id: "statutory_registers", name: "Statutory Registers", price: 2999 },
    ],
    gst_documents: [
        { id: "gst_engagement_letter", name: "GST Engagement Letter", price: 1499 },
        { id: "self_affidavit_gst", name: "Self-Affidavit for GST Registration", price: 999 },
    ],
    accounting_documents: [
        { id: "accounting_engagement_letter", name: "Accounting Engagement Letter", price: 1499 },
    ],
    itr_filing: [
        { id: "itr1", name: "ITR-1 (Salaried Individuals)", price: 999 },
        { id: "itr2", name: "ITR-2 (Individuals with Capital Gains)", price: 1999 },
        { id: "itr3", name: "ITR-3 (Business/Profession Income)", price: 2999 },
        { id: "itr4", name: "ITR-4 (Presumptive Taxation)", price: 2499 },
    ],
    compliance_plans: [
        { id: "core_monthly", name: "Core Compliance (Monthly)", price: 2999 },
        { id: "core_annual", name: "Core Compliance (Annual)", price: 29990 },
        { id: "statutory_monthly", name: "Statutory Compliance (Monthly)", price: 5999 },
        { id: "statutory_annual", name: "Statutory Compliance (Annual)", price: 59990 },
        { id: "complete_monthly", name: "Complete Compliance (Monthly)", price: 9999 },
        { id: "complete_annual", name: "Complete Compliance (Annual)", price: 99990 },
    ],
};

export { getServicePricing, onPricingUpdate };
