/**
 * Cashfree SDK v3 Dynamic Loader
 * Loads Cashfree SDK dynamically and ensures it's ready before use
 */

export function loadCashfree(): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, return immediately
    if (window.Cashfree) {
      console.log('✅ Cashfree SDK already loaded');
      resolve();
      return;
    }

    // Check if script is already in the process of loading
    const existingScript = document.querySelector('script[src*="cashfree"]');
    if (existingScript) {
      console.log('⏳ Cashfree script already in DOM, waiting for load...');
      // Wait for existing script to load
      const checkLoaded = setInterval(() => {
        if (window.Cashfree) {
          clearInterval(checkLoaded);
          clearTimeout(timeout);
          console.log('✅ Cashfree SDK loaded from existing script');
          resolve();
        }
      }, 100);

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkLoaded);
        reject(new Error('Cashfree SDK failed to load within timeout'));
      }, 10000);

      return;
    }

    // Load script dynamically
    console.log('📦 Loading Cashfree SDK dynamically...');
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;

    script.onload = () => {
      console.log('✅ Cashfree SDK script loaded');
      // Give SDK a moment to initialize
      setTimeout(() => {
        if (window.Cashfree) {
          resolve();
        } else {
          reject(new Error('Cashfree SDK loaded but window.Cashfree not available'));
        }
      }, 100);
    };

    script.onerror = (err) => {
      console.error('❌ Failed to load Cashfree SDK script:', err);
      reject(new Error('Cashfree SDK failed to load'));
    };

    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

