
'use server';

/**
 * @fileOverview An AI agent that suggests legal clauses for documents.
 *
 * - suggestLegalClauses - A function that handles the clause suggestion process.
 * - SuggestLegalClausesInput - The input type for the function.
 * - SuggestLegalClausesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestLegalClausesInputSchema = z.object({
  documentType: z.string().describe('The type of legal document (e.g., "Partnership Deed", "Rental Agreement").'),
  businessActivity: z.string().describe('A description of the business or purpose of the document.'),
  existingClauses: z.string().optional().describe('A string containing any clauses already in the document.'),
});
export type SuggestLegalClausesInput = z.infer<typeof SuggestLegalClausesInputSchema>;

const SuggestLegalClausesOutputSchema = z.object({
  suggestedClauses: z.array(z.object({
    title: z.string().describe('A brief title for the clause.'),
    clauseText: z.string().describe('The full legal text of the suggested clause.'),
  })).describe('An array of suggested legal clauses.'),
});
export type SuggestLegalClausesOutput = z.infer<typeof SuggestLegalClausesOutputSchema>;

export async function suggestLegalClauses(input: SuggestLegalClausesInput): Promise<SuggestLegalClausesOutput> {
  return suggestLegalClausesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestLegalClausesPrompt',
  input: {schema: SuggestLegalClausesInputSchema},
  output: {schema: SuggestLegalClausesOutputSchema},
  prompt: `You are an expert legal assistant in India specializing in commercial and business law.

  Based on the provided document type and business activity, suggest 3-5 relevant and standard legal clauses that are commonly included.

  Document Type: {{{documentType}}}
  Business Activity: {{{businessActivity}}}
  
  {{#if existingClauses}}
  Consider the following existing clauses and avoid suggesting duplicates:
  {{{existingClauses}}}
  {{/if}}

  For each suggestion, provide a clear title and the full text for the clause.
  `, 
});

const suggestLegalClausesFlow = ai.defineFlow(
  {
    name: 'suggestLegalClausesFlow',
    inputSchema: SuggestLegalClausesInputSchema,
    outputSchema: SuggestLegalClausesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
