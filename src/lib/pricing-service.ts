
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { servicePricing, ServicePricing } from "./on-demand-pricing";

const PRICING_DOC_ID = "on_demand_service_pricing";
const pricingDocRef = doc(db, "configuration", PRICING_DOC_ID);

/**
 * Fetches the current service pricing from Firestore.
 * If no pricing is found, it initializes Firestore with the default prices.
 * @returns {Promise<ServicePricing>} A promise that resolves to the current service pricing.
 */
export async function getServicePricing(): Promise<ServicePricing> {
  try {
    const docSnap = await getDoc(pricingDocRef);
    if (docSnap.exists()) {
      // Merge with defaults to ensure all categories are present
      const firestoreData = docSnap.data() as ServicePricing;
      return { ...servicePricing, ...firestoreData };
    } else {
      // No pricing document found, initialize it with default values
      await setDoc(pricingDocRef, servicePricing);
      return servicePricing;
    }
  } catch (error) {
    console.error("Error fetching service pricing: ", error);
    // Return default pricing as a fallback
    return servicePricing;
  }
}

/**
 * Subscribes to real-time updates of the service pricing.
 * @param {(pricing: ServicePricing) => void} callback - The function to call when pricing data changes.
 * @returns {() => void} An unsubscribe function.
 */
export function onPricingUpdate(callback: (pricing: ServicePricing) => void): () => void {
  const unsubscribe = onSnapshot(pricingDocRef, (doc) => {
    if (doc.exists()) {
        const firestoreData = doc.data() as ServicePricing;
        callback({ ...servicePricing, ...firestoreData });
    }
  });

  return unsubscribe;
}
