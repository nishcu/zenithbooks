import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (value: number) => {
    if (isNaN(value)) return '₹0.00';
    // A value of -0.000001 should be 0.00, not -0.00
    if (Math.abs(value) < 0.01) value = 0;
    return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}
