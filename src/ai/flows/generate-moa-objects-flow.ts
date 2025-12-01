
'use server';

/**
 * @fileOverview An AI agent that generates the main objects clause for a Memorandum of Association (MOA).
 *
 * - generateMoaObjects - A function that handles the main objects clause generation.
 * - GenerateMoaObjectsInput - The input type for the function.
 * - GenerateMoaObjectsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMoaObjectsInputSchema = z.object({
  companyName: z.string().describe('The name of the company.'),
  businessDescription: z.string().describe('A plain-language description of the company\'s business activities and purpose.'),
});
export type GenerateMoaObjectsInput = z.infer<typeof GenerateMoaObjectsInputSchema>;

const GenerateMoaObjectsOutputSchema = z.object({
  mainObjects: z.string().describe('The formatted "Main Objects" clause for the MOA, including objects to be pursued by the company upon its incorporation.'),
});
export type GenerateMoaObjectsOutput = z.infer<typeof GenerateMoaObjectsOutputSchema>;

export async function generateMoaObjects(input: GenerateMoaObjectsInput): Promise<GenerateMoaObjectsOutput> {
  return generateMoaObjectsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMoaObjectsPrompt',
  input: {schema: GenerateMoaObjectsInputSchema},
  output: {schema: GenerateMoaObjectsOutputSchema},
  prompt: `You are an expert corporate legal assistant in India, specializing in drafting documents for company incorporation under the Companies Act, 2013.

  Your task is to draft the "Main Objects" clause for the Memorandum of Association (MOA) for a new company.

  Company Name: {{{companyName}}}
  Business Description: {{{businessDescription}}}

  Based on the business description, draft a comprehensive "Main Objects" clause as a single block of text. The clause should be professionally worded, legally sound, and formatted as a numbered list within the text block. It should accurately reflect the core business activities described.

  Start the clause with the standard legal heading: "THE OBJECTS TO BE PURSUED BY THE COMPANY ON ITS INCORPORATION ARE:"

  Generate at least 3 to 5 distinct object points. Each point should start with "1. To carry on the business of..." or a similar infinitive phrase, followed by the next number.
  `,
});

const generateMoaObjectsFlow = ai.defineFlow(
  {
    name: 'generateMoaObjectsFlow',
    inputSchema: GenerateMoaObjectsInputSchema,
    outputSchema: GenerateMoaObjectsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
