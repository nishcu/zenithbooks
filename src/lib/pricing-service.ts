
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { servicePricing, ServicePricing } from "./on-demand-pricing";

const PRICING_DOC_ID = "on_demand_service_pricing";
const pricingDocRef = doc(db, "configuration", PRICING_DOC_ID);

type ServiceItem = { id: string; name: string; price: number };

function mergeServiceLists(defaults: ServiceItem[] = [], stored: ServiceItem[] = []): ServiceItem[] {
  const byId = new Map<string, ServiceItem>();

  // start with defaults (ensures new services always appear)
  for (const s of defaults) {
    if (s?.id) byId.set(s.id, s);
  }

  // overlay stored values (preserve admin-edited prices/names)
  for (const s of stored) {
    if (s?.id) {
      const base = byId.get(s.id);
      byId.set(s.id, { ...(base || s), ...s });
    }
  }

  // keep stable order: defaults first, then any extra stored items appended
  const out: ServiceItem[] = [];
  const seen = new Set<string>();
  for (const s of defaults) {
    if (s?.id && byId.has(s.id)) {
      out.push(byId.get(s.id)!);
      seen.add(s.id);
    }
  }
  for (const s of stored) {
    if (s?.id && !seen.has(s.id) && byId.has(s.id)) {
      out.push(byId.get(s.id)!);
      seen.add(s.id);
    }
  }
  return out;
}

function mergePricing(defaults: ServicePricing, stored?: Partial<ServicePricing> | null): ServicePricing {
  const s = stored || {};
  return {
    reports: mergeServiceLists(defaults.reports, s.reports as any),
    ca_certs: mergeServiceLists(defaults.ca_certs, s.ca_certs as any),
    registration_deeds: mergeServiceLists(defaults.registration_deeds, s.registration_deeds as any),
    founder_startup: mergeServiceLists(defaults.founder_startup, s.founder_startup as any),
    agreements: mergeServiceLists(defaults.agreements, s.agreements as any),
    hr_documents: mergeServiceLists(defaults.hr_documents, s.hr_documents as any),
    company_documents: mergeServiceLists(defaults.company_documents, s.company_documents as any),
    gst_documents: mergeServiceLists(defaults.gst_documents, s.gst_documents as any),
    accounting_documents: mergeServiceLists(defaults.accounting_documents, s.accounting_documents as any),
    notice_handling: mergeServiceLists(defaults.notice_handling, s.notice_handling as any),
    itr_filing: mergeServiceLists(defaults.itr_filing, s.itr_filing as any),
  };
}

/**
 * Fetches the current service pricing from Firestore.
 * If no pricing is found, it initializes Firestore with the default prices.
 * @returns {Promise<ServicePricing>} A promise that resolves to the current service pricing.
 */
export async function getServicePricing(): Promise<ServicePricing> {
  try {
    const docSnap = await getDoc(pricingDocRef);
    if (docSnap.exists()) {
      // Deep-merge per category by id so new defaults appear even if Firestore already exists
      const firestoreData = docSnap.data() as Partial<ServicePricing>;
      return mergePricing(servicePricing, firestoreData);
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
        const firestoreData = doc.data() as Partial<ServicePricing>;
        callback(mergePricing(servicePricing, firestoreData));
    }
  });

  return unsubscribe;
}
