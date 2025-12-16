
"use server";

import {
  suggestHsnCodes,
  type SuggestHsnCodesInput,
  type SuggestHsnCodesOutput,
} from "@/ai/flows/suggest-hsn-codes";

export async function suggestHsnCodeAction(
  input: SuggestHsnCodesInput
): Promise<SuggestHsnCodesOutput | null> {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("AI service is not configured. Please set GEMINI_API_KEY environment variable.");
    }

    const result = await suggestHsnCodes(input);
    
    if (!result || !result.hsnCode) {
      console.error("Invalid response from AI:", result);
      throw new Error("AI service returned an invalid response. Please try again.");
    }
    
    return result;
  } catch (error: any) {
    console.error("Error in suggestHsnCodeAction:", error);
    
    // Return a more descriptive error
    if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error("Failed to get HSN code suggestion. Please check if GEMINI_API_KEY is configured and try again.");
  }
}
