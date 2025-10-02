'use server';

/**
 * @fileOverview This file defines a Genkit flow for AI-powered ITC reconciliation.
 * 
 * reconcileItc - A function that reconciles Input Tax Credit (ITC) by comparing uploaded GSTR-2B CSV data against purchase bills using AI.
 * ReconcileItcInput - The input type for the reconcileItc function, including the GSTR-2B CSV data URI.
 * ReconcileItcOutput - The output type for the reconcileItc function, providing reconciliation results with identified discrepancies and suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReconcileItcInputSchema = z.object({
  gstr2bDataUri: z
    .string()
    .describe(
      'The GSTR-2B CSV data as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected the expected format
    ),
  purchaseBills: z.string().describe('The purchase bills data in JSON format.'),
});
export type ReconcileItcInput = z.infer<typeof ReconcileItcInputSchema>;

const ReconcileItcOutputSchema = z.object({
  reconciliationResults: z
    .string()
    .describe(
      'The reconciliation results, including identified discrepancies and suggestions for correction, in JSON format.'
    ),
});
export type ReconcileItcOutput = z.infer<typeof ReconcileItcOutputSchema>;

export async function reconcileItc(input: ReconcileItcInput): Promise<ReconcileItcOutput> {
  return reconcileItcFlow(input);
}

const reconcileItcPrompt = ai.definePrompt({
  name: 'reconcileItcPrompt',
  input: {schema: ReconcileItcInputSchema},
  output: {schema: ReconcileItcOutputSchema},
  prompt: `You are an expert accountant specializing in Input Tax Credit (ITC) reconciliation for Indian businesses.

You will receive GSTR-2B data in CSV format and purchase bill data in JSON format.

Compare the purchase bills data against the GSTR-2B data to identify potential discrepancies and suggest corrections to ensure accurate ITC claims.

GSTR-2B Data: {{media url=gstr2bDataUri}}
Purchase Bills Data: {{{purchaseBills}}}

Return the reconciliation results, including identified discrepancies and suggestions for correction, in JSON format.`, // Removed extraneous backticks.
});

const reconcileItcFlow = ai.defineFlow(
  {
    name: 'reconcileItcFlow',
    inputSchema: ReconcileItcInputSchema,
    outputSchema: ReconcileItcOutputSchema,
  },
  async input => {
    const {output} = await reconcileItcPrompt(input);
    return output!;
  }
);
