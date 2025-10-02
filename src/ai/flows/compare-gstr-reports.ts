// src/ai/flows/compare-gstr-reports.ts
'use server';

/**
 * @fileOverview Compares GSTR-1 and GSTR-3B reports using AI to identify discrepancies.
 *
 * - compareGstrReports - A function that analyzes discrepancies between GSTR-1 and GSTR-3B reports.
 * - CompareGstrReportsInput - The input type for the compareGstrReports function.
 * - CompareGstrReportsOutput - The return type for the compareGstrReports function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompareGstrReportsInputSchema = z.object({
  gstr1DataUri: z
    .string()
    .describe(
      "A data URI containing the GSTR-1 report data in CSV format. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  gstr3BDataUri: z
    .string()
    .describe(
      "A data URI containing the GSTR-3B report data in CSV format. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type CompareGstrReportsInput = z.infer<typeof CompareGstrReportsInputSchema>;

const CompareGstrReportsOutputSchema = z.object({
  report: z
    .string()
    .describe(
      'A report summarizing the discrepancies between the GSTR-1 and GSTR-3B reports, including potential causes and recommended actions for resolving variances.'
    ),
});
export type CompareGstrReportsOutput = z.infer<typeof CompareGstrReportsOutputSchema>;

export async function compareGstrReports(input: CompareGstrReportsInput): Promise<CompareGstrReportsOutput> {
  return compareGstrReportsFlow(input);
}

const compareGstrReportsPrompt = ai.definePrompt({
  name: 'compareGstrReportsPrompt',
  input: {schema: CompareGstrReportsInputSchema},
  output: {schema: CompareGstrReportsOutputSchema},
  prompt: `You are an expert GST compliance officer.

You will analyze the provided GSTR-1 and GSTR-3B reports to identify discrepancies and suggest solutions for any variances.

GSTR-1 Data: {{media url=gstr1DataUri}}
GSTR-3B Data: {{media url=gstr3BDataUri}}

Generate a detailed report highlighting the discrepancies and suggesting corrective actions.
`,
});

const compareGstrReportsFlow = ai.defineFlow(
  {
    name: 'compareGstrReportsFlow',
    inputSchema: CompareGstrReportsInputSchema,
    outputSchema: CompareGstrReportsOutputSchema,
  },
  async input => {
    const {output} = await compareGstrReportsPrompt(input);
    return output!;
  }
);
