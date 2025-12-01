'use server';

/**
 * @fileOverview An AI agent that suggests HSN codes for products/services.
 *
 * - suggestHsnCodes - A function that handles the HSN code suggestion process.
 * - SuggestHsnCodesInput - The input type for the suggestHsnCodes function.
 * - SuggestHsnCodesOutput - The return type for the suggestHsnCodes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestHsnCodesInputSchema = z.object({
  productOrServiceDescription: z
    .string()
    .describe('The description of the product or service.'),
});
export type SuggestHsnCodesInput = z.infer<typeof SuggestHsnCodesInputSchema>;

const SuggestHsnCodesOutputSchema = z.object({
  hsnCode: z.string().describe('The suggested HSN code for the product or service.'),
  confidence: z
    .number()
    .describe('The confidence level of the suggestion (0-1).')
    .optional(),
});
export type SuggestHsnCodesOutput = z.infer<typeof SuggestHsnCodesOutputSchema>;

export async function suggestHsnCodes(input: SuggestHsnCodesInput): Promise<SuggestHsnCodesOutput> {
  return suggestHsnCodesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHsnCodesPrompt',
  input: {schema: SuggestHsnCodesInputSchema},
  output: {schema: SuggestHsnCodesOutputSchema},
  prompt: `You are an expert in classifying products and services according to the Harmonized System of Nomenclature (HSN).

  Given the following description of a product or service, suggest the most appropriate HSN code.

  Description: {{{productOrServiceDescription}}}

  Respond with only the HSN code and a confidence level.`, 
});

const suggestHsnCodesFlow = ai.defineFlow(
  {
    name: 'suggestHsnCodesFlow',
    inputSchema: SuggestHsnCodesInputSchema,
    outputSchema: SuggestHsnCodesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
