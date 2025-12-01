
'use server';

/**
 * @fileOverview An AI agent that generates standard terms and conditions for a business.
 *
 * - generateTerms - A function that handles the T&C generation process.
 * - GenerateTermsInput - The input type for the generateTerms function.
 * - GenerateTermsOutput - The return type for the generateTerms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTermsInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
});
export type GenerateTermsInput = z.infer<typeof GenerateTermsInputSchema>;

const GenerateTermsOutputSchema = z.object({
  terms: z.string().describe('The generated terms and conditions text.'),
});
export type GenerateTermsOutput = z.infer<typeof GenerateTermsOutputSchema>;

export async function generateTerms(input: GenerateTermsInput): Promise<GenerateTermsOutput> {
  return generateTermsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTermsPrompt',
  input: {schema: GenerateTermsInputSchema},
  output: {schema: GenerateTermsOutputSchema},
  prompt: `You are an expert legal assistant specializing in commercial law for Indian businesses.

  Given the company name: {{{companyName}}}, generate a standard set of terms and conditions suitable for placing on a sales invoice. The terms should be concise and cover common topics like payment terms (e.g., Net 30), late payment fees, and dispute resolution jurisdiction (mentioning a major Indian city).

  The output should be a single block of text. Do not use markdown formatting like headers or bullet points.
  `, 
});

const generateTermsFlow = ai.defineFlow(
  {
    name: 'generateTermsFlow',
    inputSchema: GenerateTermsInputSchema,
    outputSchema: GenerateTermsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
