
"use server";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { servicePricing, ServicePricing } from "@/lib/on-demand-pricing";
import { revalidatePath } from "next/cache";

const PRICING_DOC_ID = "on_demand_service_pricing";

export async function saveServicePricingAction(updatedPricing: ServicePricing) {
  try {
    const pricingRef = doc(db, "configuration", PRICING_DOC_ID);
    await setDoc(pricingRef, updatedPricing);
    revalidatePath("/admin/service-pricing");
    return { success: true };
  } catch (error) {
    console.error("Error saving service pricing:", error);
    return { success: false, error: "Failed to save pricing." };
  }
}
