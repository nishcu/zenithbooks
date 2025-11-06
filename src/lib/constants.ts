/**
 * Application-wide constants
 * Centralized location for magic numbers, strings, and configuration values
 */

// User Roles
export const USER_ROLES = {
  BUSINESS: 'business',
  PROFESSIONAL: 'professional',
  SUPER_ADMIN: 'super_admin',
} as const;

// Super Admin UID
export const SUPER_ADMIN_UID = '9soE3VaoHzUcytSTtA9SaFS7cC82';

// Toast Messages
export const TOAST_MESSAGES = {
  SUCCESS: {
    LOGIN: { title: 'Login Successful', description: 'Welcome back!' },
    SIGNUP: { title: 'Account Created!', description: 'You have been successfully signed up and logged in.' },
    SAVE: { title: 'Saved', description: 'Your changes have been saved successfully.' },
    DELETE: { title: 'Deleted', description: 'Item has been deleted successfully.' },
    UPDATE: { title: 'Updated', description: 'Item has been updated successfully.' },
    SUBMIT: { title: 'Submitted', description: 'Your request has been submitted successfully.' },
  },
  ERROR: {
    LOGIN: { title: 'Login Failed', description: 'Invalid credentials. Please try again.' },
    SIGNUP: { title: 'Sign Up Failed', description: 'An error occurred during signup. Please try again.' },
    AUTH: { title: 'Authentication Error', description: 'You must be logged in to perform this action.' },
    NETWORK: { title: 'Network Error', description: 'Please check your internet connection and try again.' },
    GENERIC: { title: 'Error', description: 'An unexpected error occurred. Please try again.' },
    VALIDATION: { title: 'Validation Error', description: 'Please check your input and try again.' },
  },
  INFO: {
    LOADING: { title: 'Loading...', description: 'Please wait while we process your request.' },
    GENERATING: { title: 'Generating PDF...', description: 'Your document is being prepared for download.' },
  },
} as const;

// Form Validation Messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'This field is required.',
  EMAIL: 'Please enter a valid email address.',
  PASSWORD_MIN: 'Password must be at least 6 characters.',
  PASSWORD_MATCH: 'Passwords do not match.',
  PHONE: 'Please enter a valid phone number.',
  GSTIN: 'Please enter a valid GSTIN (15 characters).',
  PAN: 'Please enter a valid PAN (10 characters).',
  POSITIVE_NUMBER: 'Please enter a positive number.',
  MIN_LENGTH: (min: number) => `Must be at least ${min} characters.`,
  MAX_LENGTH: (max: number) => `Must be no more than ${max} characters.`,
} as const;

// Loading States
export const LOADING_STATES = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  IDLE: 'idle',
} as const;

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM, yyyy',
  DISPLAY_WITH_TIME: 'dd MMM, yyyy HH:mm',
  INPUT: 'yyyy-MM-dd',
  MONTH_YEAR: 'MMM yyyy',
  YEAR_MONTH: 'yyyy-MM',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

// File Upload
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Chart Colors
export const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'] as const;

// Routes
export const ROUTES = {
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  SIGNUP: '/signup',
  BILLING: {
    INVOICES: '/billing/invoices',
    NEW_INVOICE: '/billing/invoices/new',
    SALES_ORDERS: '/billing/sales-orders',
    CREDIT_NOTES: '/billing/credit-notes',
    DEBIT_NOTES: '/billing/debit-notes',
  },
  ACCOUNTING: {
    TRIAL_BALANCE: '/accounting/trial-balance',
    LEDGERS: '/accounting/ledgers',
    JOURNAL: '/accounting/journal',
    BALANCE_SHEET: '/accounting/financial-statements/balance-sheet',
    PROFIT_LOSS: '/accounting/financial-statements/profit-and-loss',
  },
} as const;

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
  DASHBOARD: 'escape',
  NEW_INVOICE: 'ctrl+i',
  NEW_PURCHASE: 'ctrl+p',
  JOURNAL: 'ctrl+j',
  NEW_CREDIT_NOTE: 'alt+n',
  NEW_DEBIT_NOTE: 'ctrl+d',
  RAPID_VOUCHER: 'ctrl+r',
  BALANCE_SHEET: 'ctrl+b',
  PROFIT_LOSS: 'ctrl+l',
  TRIAL_BALANCE: 'alt+t',
  LEDGERS: 'ctrl+g',
  PARTIES: 'alt+p',
  ITEMS: 'alt+i',
} as const;

// Error Codes
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

