
"use server";

import {
  generateMoaObjects,
  type GenerateMoaObjectsInput,
  type GenerateMoaObjectsOutput,
} from "@/ai/flows/generate-moa-objects-flow";

export async function generateMoaObjectsAction(
  input: GenerateMoaObjectsInput
): Promise<GenerateMoaObjectsOutput | null> {
  try {
    const result = await generateMoaObjects(input);
    return result;
  } catch (error) {
    console.error("Error in generateMoaObjectsAction:", error);
    throw new Error("Failed to get MOA objects suggestion.");
  }
}
