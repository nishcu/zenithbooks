
"use server";

import {
  getCmaObservations,
  type GetCmaObservationsInput,
  type GetCmaObservationsOutput,
} from "@/ai/flows/get-cma-observations-flow";

export async function getCmaObservationsAction(
  input: GetCmaObservationsInput
): Promise<GetCmaObservationsOutput | null> {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      throw new Error("AI service is not configured. Please set GEMINI_API_KEY environment variable.");
    }

    const result = await getCmaObservations(input);
    
    if (!result || !result.observations) {
      console.error("Invalid response from AI:", result);
      throw new Error("AI service returned an invalid response. Please try again.");
    }
    
    return result;
  } catch (error: any) {
    console.error("Error in getCmaObservationsAction:", error);
    
    // Return a more descriptive error
    if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error("Failed to get CMA observations from AI. Please check if GEMINI_API_KEY is configured and try again.");
  }
}
