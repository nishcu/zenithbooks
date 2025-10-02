
"use server";

import {
  suggestLegalClauses,
  type SuggestLegalClausesInput,
  type SuggestLegalClausesOutput,
} from "@/ai/flows/suggest-legal-clauses-flow";

export async function suggestClausesAction(
  input: SuggestLegalClausesInput
): Promise<SuggestLegalClausesOutput | null> {
  try {
    const result = await suggestLegalClauses(input);
    return result;
  } catch (error) {
    console.error("Error in suggestClausesAction:", error);
    throw new Error("Failed to get clause suggestions from AI.");
  }
}

    
