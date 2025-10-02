
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
    const result = await getCmaObservations(input);
    return result;
  } catch (error) {
    console.error("Error in getCmaObservationsAction:", error);
    throw new Error("Failed to get CMA observations from AI.");
  }
}
