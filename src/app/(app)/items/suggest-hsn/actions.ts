
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
    const result = await suggestHsnCodes(input);
    return result;
  } catch (error) {
    console.error("Error in suggestHsnCodeAction:", error);
    // In a real application, you might want to throw a more specific error
    // that the client can handle gracefully.
    return null;
  }
}
