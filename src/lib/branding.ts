export type BrandingSettings = {
  companyName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  pan?: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  bankName?: string;
  bankAccount?: string;
  bankIfsc?: string;
  upiId?: string;
  defaultPaymentTerms: "due_on_receipt" | "net_15" | "net_30" | "net_45";
  invoiceTerms?: string;
  logoDataUrl?: string | null;
};

const BRANDING_STORAGE_KEY = "brandingSettings";

export const defaultBrandingSettings: BrandingSettings = {
  companyName: "ZenithBooks Inc.",
  address1: "123 Business Rd, Industrial Area",
  address2: "Suite 456, Near Landmark",
  city: "Commerce City",
  state: "Maharashtra",
  pincode: "400001",
  gstin: "27ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  invoicePrefix: "INV-",
  invoiceNextNumber: 1,
  bankName: "HDFC Bank",
  bankAccount: "1234567890",
  bankIfsc: "HDFC0001234",
  upiId: "yourbusiness@okhdfcbank",
  defaultPaymentTerms: "net_30",
  invoiceTerms:
    "1. All payments to be made via cheque or NEFT. 2. Goods once sold will not be taken back. 3. Interest @18% p.a. will be charged on overdue bills.",
  logoDataUrl: null,
};

export const readBrandingSettings = (): BrandingSettings => {
  if (typeof window === "undefined") {
    return defaultBrandingSettings;
  }

  try {
    const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) {
      return defaultBrandingSettings;
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultBrandingSettings,
      ...parsed,
      invoiceNextNumber: Number(parsed.invoiceNextNumber) || defaultBrandingSettings.invoiceNextNumber,
    };
  } catch (error) {
    console.warn("Failed to read branding settings:", error);
    return defaultBrandingSettings;
  }
};

export const writeBrandingSettings = (settings: BrandingSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Failed to persist branding settings:", error);
  }
};

