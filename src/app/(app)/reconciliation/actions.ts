
"use server";

import {
  reconcileItc,
  type ReconcileItcInput,
  type ReconcileItcOutput,
} from "@/ai/flows/reconcile-itc-flow";
import {
  compareGstrReports,
  type CompareGstrReportsInput,
  type CompareGstrReportsOutput,
} from "@/ai/flows/compare-gstr-reports";

export async function reconcileItcAction(
  input: ReconcileItcInput
): Promise<ReconcileItcOutput | null> {
  try {
    // In a real app, you would fetch purchase bills from your database.
    // For this demo, we'll use a hardcoded JSON string.
    const purchaseBillsJson = JSON.stringify([
        { "invoiceNo": "INV-101", "amount": 1000, "tax": 180 },
        { "invoiceNo": "INV-102", "amount": 2500, "tax": 450 },
    ]);

    const result = await reconcileItc({
        gstr2bDataUri: input.gstr2bDataUri,
        purchaseBills: purchaseBillsJson
    });

    return result;
  } catch (error) {
    console.error("Error in reconcileItcAction:", error);
    throw new Error("Failed to reconcile ITC.");
  }
}

export async function compareGstrReportsAction(
  input: CompareGstrReportsInput
): Promise<CompareGstrReportsOutput | null> {
  try {
    const result = await compareGstrReports(input);
    return result;
  } catch (error) {
    console.error("Error in compareGstrReportsAction:", error);
    throw new Error("Failed to compare GSTR reports.");
  }
}
