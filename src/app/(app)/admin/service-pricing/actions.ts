
"use server";

import * as fs from "fs/promises";
import * as path from "path";
import { servicePricing as initialServices } from "@/lib/on-demand-pricing";

type ServicePricing = typeof initialServices;

export async function saveServicePricingAction(
  updatedServices: ServicePricing
): Promise<{ success: boolean; error?: string }> {
  try {
    const pricingFilePath = path.join(
      process.cwd(),
      "src",
      "lib",
      "on-demand-pricing.ts"
    );
    
    // Construct the file content as a TypeScript module
    const fileContent = `
export const servicePricing = ${JSON.stringify(updatedServices, null, 2)};
`;

    await fs.writeFile(pricingFilePath, fileContent.trim(), "utf-8");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error saving service pricing:", error);
    return { success: false, error: error.message };
  }
}
