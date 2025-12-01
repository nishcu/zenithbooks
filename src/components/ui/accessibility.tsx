/**
 * Accessibility utilities and components
 */

import { cn } from "@/lib/utils";

/**
 * ARIA label helper for form fields
 */
export function getAriaLabel(fieldName: string, required?: boolean): string {
  return `${fieldName}${required ? " (required)" : ""}`;
}

/**
 * ARIA described by helper
 */
export function getAriaDescribedBy(fieldId: string, hasError?: boolean, hasDescription?: boolean): string {
  const ids: string[] = [];
  if (hasDescription) ids.push(`${fieldId}-description`);
  if (hasError) ids.push(`${fieldId}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

/**
 * Keyboard navigation helper
 */
export function handleKeyDown(
  event: React.KeyboardEvent,
  onEnter?: () => void,
  onEscape?: () => void,
  onArrowUp?: () => void,
  onArrowDown?: () => void
) {
  switch (event.key) {
    case "Enter":
      if (onEnter && !event.shiftKey) {
        event.preventDefault();
        onEnter();
      }
      break;
    case "Escape":
      if (onEscape) {
        event.preventDefault();
        onEscape();
      }
      break;
    case "ArrowUp":
      if (onArrowUp) {
        event.preventDefault();
        onArrowUp();
      }
      break;
    case "ArrowDown":
      if (onArrowDown) {
        event.preventDefault();
        onArrowDown();
      }
      break;
  }
}

/**
 * Focus trap component props
 */
export interface FocusTrapProps {
  children: React.ReactNode;
  className?: string;
  onEscape?: () => void;
}

/**
 * Accessible button component with proper ARIA attributes
 */
export interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-pressed"?: boolean;
  "aria-expanded"?: boolean;
}

/**
 * Accessible input component with proper ARIA attributes
 */
export interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
}

/**
 * Screen reader only text
 */
export function ScreenReaderOnly({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("sr-only", className)} aria-live="polite">
      {children}
    </span>
  );
}

