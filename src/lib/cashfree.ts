/**
 * Cashfree SDK v3 Dynamic Loader
 * Loads Cashfree SDK dynamically and ensures it's ready before use
 */

export const loadCashfree = () => {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) {
      resolve(window.Cashfree);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;

    script.onload = () => {
      if (window.Cashfree) {
        resolve(window.Cashfree);
      } else {
        reject(new Error("Cashfree SDK failed to load"));
      }
    };

    script.onerror = () => reject(new Error("Failed to load Cashfree script"));

    document.body.appendChild(script);
  });
};

declare global {
  interface Window {
    Cashfree: any;
  }
}
