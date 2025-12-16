
"use server";

import {
  generateTerms,
  type GenerateTermsInput,
  type GenerateTermsOutput,
} from "@/ai/flows/generate-terms-flow";

export async function generateTermsAction(
  input: GenerateTermsInput
): Promise<GenerateTermsOutput | null> {
  try {
    const result = await generateTerms(input);
    return result;
  } catch (error) {
    console.error("Error in generateTermsAction:", error);
    throw new Error("Failed to generate terms and conditions.");
  }
}
