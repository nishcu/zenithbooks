
'use server';

/**
 * @fileOverview An AI agent that analyzes CMA report data and provides observations.
 *
 * - getCmaObservations - A function that handles the CMA analysis process.
 * - GetCmaObservationsInput - The input type for the getCmaObservations function.
 * - GetCmaObservationsOutput - The return type for the getCmaObservations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GetCmaObservationsInputSchema = z.object({
  reportSummary: z
    .string()
    .describe(
      'A JSON string containing a summary of the generated CMA report, including key P&L figures and financial ratios.'
    ),
});
export type GetCmaObservationsInput = z.infer<typeof GetCmaObservationsInputSchema>;

const GetCmaObservationsOutputSchema = z.object({
  observations: z.string().describe('The AI-generated qualitative analysis and observations on the CMA report data, written from the perspective of a credit analyst at a bank.'),
});
export type GetCmaObservationsOutput = z.infer<typeof GetCmaObservationsOutputSchema>;

export async function getCmaObservations(input: GetCmaObservationsInput): Promise<GetCmaObservationsOutput> {
  return getCmaObservationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getCmaObservationsPrompt',
  input: {schema: GetCmaObservationsInputSchema},
  output: {schema: GetCmaObservationsOutputSchema},
  prompt: `You are an expert credit analyst at a major Indian bank, specializing in assessing loan proposals from SME and MSME businesses.

  You have been provided with a summary of a company's projected financials from a CMA report. Your task is to provide a concise, professional analysis of this data.

  Your analysis should cover the following points:
  1.  **Sales Growth:** Comment on the projected sales trend. Is it realistic? Aggressive? Stable?
  2.  **Profitability:** Analyze the profitability margins (e.g., PBT as a percentage of sales). Are they improving, declining, or stable?
  3.  **Liquidity:** Based on the Current Ratio, comment on the company's ability to meet its short-term obligations.
  4.  **Leverage & Solvency:** Comment on the Debt-Equity ratio. How leveraged is the company?
  5.  **Debt Service Capability:** This is critical. Analyze the DSCR (Debt Service Coverage Ratio). A DSCR greater than 1.5 is generally considered healthy. Is the company generating enough cash to comfortably repay its proposed loan obligations?
  6.  **Overall Recommendation:** Conclude with a brief, high-level opinion on the financial viability of the proposal.

  Structure your response as a series of paragraphs. Use professional, banking-industry terminology.

  Here is the financial data summary:
  {{{reportSummary}}}
  `, 
});

const getCmaObservationsFlow = ai.defineFlow(
  {
    name: 'getCmaObservationsFlow',
    inputSchema: GetCmaObservationsInputSchema,
    outputSchema: GetCmaObservationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
