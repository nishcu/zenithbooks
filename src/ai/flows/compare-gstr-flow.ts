// src/ai/flows/compare-gstr-flow.ts
'use server';

/**
 * @fileOverview Compares GSTR-1 and GSTR-3B filings using AI to identify discrepancies.
 *
 * - compareGSTR - A function that analyzes discrepancies between GSTR-1 and GSTR-3B filings.
 * - CompareGSTRInput - The input type for the compareGSTR function.
 * - CompareGSTROutput - The return type for the compareGSTR function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CompareGSTRInputSchema = z.object({
  gstr1DataUri: z
    .string()
    .describe(
      "A data URI containing the GSTR-1 filing data in CSV format.  Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  gstr3BDataUri: z
    .string()
    .describe(
      "A data URI containing the GSTR-3B filing data in CSV format. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type CompareGSTRInput = z.infer<typeof CompareGSTRInputSchema>;

const CompareGSTROutputSchema = z.object({
  report: z
    .string()
    .describe(
      'A report summarizing the discrepancies between the GSTR-1 and GSTR-3B filings, including potential causes and recommended actions.'
    ),
});
export type CompareGSTROutput = z.infer<typeof CompareGSTROutputSchema>;

export async function compareGSTR(input: CompareGSTRInput): Promise<CompareGSTROutput> {
  return compareGSTRFlow(input);
}

const compareGSTRPrompt = ai.definePrompt({
  name: 'compareGSTRPrompt',
  input: {schema: CompareGSTRInputSchema},
  output: {schema: CompareGSTROutputSchema},
  prompt: `You are an expert GST compliance officer.

You will analyze the provided GSTR-1 and GSTR-3B filings to identify discrepancies.
Explain potential causes for each discrepancy and suggest recommended actions to ensure compliance.

GSTR-1 Data: {{media url=gstr1DataUri}}
GSTR-3B Data: {{media url=gstr3BDataUri}}

Generate a comprehensive report summarizing your findings.
`,
});

const compareGSTRFlow = ai.defineFlow(
  {
    name: 'compareGSTRFlow',
    inputSchema: CompareGSTRInputSchema,
    outputSchema: CompareGSTROutputSchema,
  },
  async input => {
    const {output} = await compareGSTRPrompt(input);
    return output!;
  }
);
