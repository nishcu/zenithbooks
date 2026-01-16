/**
 * ITR Filing Module - Constants
 */

export const ITR_STATUSES = {
  UPLOADED: 'UPLOADED',
  DATA_FETCHING: 'DATA_FETCHING',
  AIS_DOWNLOADED: 'AIS_DOWNLOADED',
  DRAFT_IN_PROGRESS: 'DRAFT_IN_PROGRESS',
  DRAFT_READY: 'DRAFT_READY',
  USER_REVIEW: 'USER_REVIEW',
  USER_APPROVED: 'USER_APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  FILING_IN_PROGRESS: 'FILING_IN_PROGRESS',
  FILED: 'FILED',
  E_VERIFIED: 'E_VERIFIED',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

export const ITR_FORM_TYPES = {
  ITR1: 'ITR-1',
  ITR2: 'ITR-2',
  ITR3: 'ITR-3',
  ITR4: 'ITR-4',
} as const;

export const DOCUMENT_TYPES = {
  PAN_FRONT: 'PAN_FRONT',
  PAN_BACK: 'PAN_BACK',
  FORM_16: 'FORM_16',
  BANK_STATEMENT: 'BANK_STATEMENT',
  RENT_RECEIPT: 'RENT_RECEIPT',
  LIC_PREMIUM: 'LIC_PREMIUM',
  HOME_LOAN_STATEMENT: 'HOME_LOAN_STATEMENT',
  AIS_PDF: 'AIS_PDF',
  AIS_JSON: 'AIS_JSON',
  FORM_26AS: 'FORM_26AS',
  TIS: 'TIS',
  PAST_ITR: 'PAST_ITR',
  ITR_DRAFT: 'ITR_DRAFT',
  ITR_V: 'ITR_V',
  FILING_ACKNOWLEDGEMENT: 'FILING_ACKNOWLEDGEMENT',
  OTHER: 'OTHER',
} as const;

export const STATUS_LABELS: Record<string, string> = {
  UPLOADED: 'Documents Uploaded',
  DATA_FETCHING: 'Fetching Data',
  AIS_DOWNLOADED: 'AIS Downloaded',
  DRAFT_IN_PROGRESS: 'Draft in Progress',
  DRAFT_READY: 'Draft Ready',
  USER_REVIEW: 'Under Review',
  USER_APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes Requested',
  FILING_IN_PROGRESS: 'Filing in Progress',
  FILED: 'Filed',
  E_VERIFIED: 'E-Verified',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
};

export const STATUS_COLORS: Record<string, string> = {
  UPLOADED: 'bg-blue-100 text-blue-800',
  DATA_FETCHING: 'bg-yellow-100 text-yellow-800',
  AIS_DOWNLOADED: 'bg-green-100 text-green-800',
  DRAFT_IN_PROGRESS: 'bg-purple-100 text-purple-800',
  DRAFT_READY: 'bg-indigo-100 text-indigo-800',
  USER_REVIEW: 'bg-orange-100 text-orange-800',
  USER_APPROVED: 'bg-green-100 text-green-800',
  CHANGES_REQUESTED: 'bg-red-100 text-red-800',
  FILING_IN_PROGRESS: 'bg-blue-100 text-blue-800',
  FILED: 'bg-green-100 text-green-800',
  E_VERIFIED: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

// Financial Year Helper
export function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  
  if (month >= 4) {
    // April to December: Current year - Next year
    return `${year}-${(year + 1).toString().substring(2)}`;
  } else {
    // January to March: Previous year - Current year
    return `${year - 1}-${year.toString().substring(2)}`;
  }
}

export function getFinancialYearList(count: number = 5): string[] {
  const currentFY = getCurrentFinancialYear();
  const [startYear] = currentFY.split('-');
  const years: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const year = parseInt(startYear) - i;
    const nextYear = (year + 1).toString().substring(2);
    years.push(`${year}-${nextYear}`);
  }
  
  return years;
}

// Storage Paths
export const ITR_STORAGE_PATHS = {
  getDocumentPath: (userId: string, applicationId: string, documentType: string, fileName: string) => {
    return `itr/${userId}/${applicationId}/documents/${documentType}/${fileName}`;
  },
  getAISPath: (userId: string, applicationId: string, type: 'PDF' | 'JSON') => {
    return `itr/${userId}/${applicationId}/ais/ais.${type.toLowerCase()}`;
  },
  get26ASPath: (userId: string, applicationId: string) => {
    return `itr/${userId}/${applicationId}/26as/form26as.pdf`;
  },
  getDraftPath: (userId: string, applicationId: string) => {
    return `itr/${userId}/${applicationId}/draft/draft.pdf`;
  },
  getITRVPath: (userId: string, applicationId: string) => {
    return `itr/${userId}/${applicationId}/filing/itrv.pdf`;
  },
  getAcknowledgementPath: (userId: string, applicationId: string) => {
    return `itr/${userId}/${applicationId}/filing/acknowledgement.pdf`;
  },
};

// File Upload Limits
export const ITR_UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
  ALLOWED_PDF_TYPES: ['application/pdf'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
};

