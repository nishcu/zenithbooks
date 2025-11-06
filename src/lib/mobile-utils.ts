/**
 * Mobile utilities and helpers
 */

/**
 * Check if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Check if device is tablet
 */
export function isTabletDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768 && window.innerWidth < 1024;
}

/**
 * Check if device is touch-enabled
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * Get viewport width
 */
export function getViewportWidth(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth;
}

/**
 * Get viewport height
 */
export function getViewportHeight(): number {
  if (typeof window === "undefined") return 0;
  return window.innerHeight;
}

/**
 * Check if viewport is mobile size
 */
export function isMobileViewport(): boolean {
  return getViewportWidth() < 768;
}

/**
 * Check if viewport is tablet size
 */
export function isTabletViewport(): boolean {
  const width = getViewportWidth();
  return width >= 768 && width < 1024;
}

/**
 * Check if viewport is desktop size
 */
export function isDesktopViewport(): boolean {
  return getViewportWidth() >= 1024;
}

