
'use server';

/**
 * @fileOverview An AI agent that analyzes a company logo.
 *
 * - analyzeLogo - A function that handles the logo analysis process.
 * - AnalyzeLogoInput - The input type for the analyzeLogo function.
 * - AnalyzeLogoOutput - The return type for the analyzeLogo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeLogoInputSchema = z.object({
  logoDataUri: z
    .string()
    .describe(
      "A data URI of the company logo. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeLogoInput = z.infer<typeof AnalyzeLogoInputSchema>;

const AnalyzeLogoOutputSchema = z.object({
  analysis: z.string().describe('A brief analysis of the logo, commenting on its design, color palette, and suitability for a business.'),
});
export type AnalyzeLogoOutput = z.infer<typeof AnalyzeLogoOutputSchema>;

export async function analyzeLogo(input: AnalyzeLogoInput): Promise<AnalyzeLogoOutput> {
  return analyzeLogoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeLogoPrompt',
  input: {schema: AnalyzeLogoInputSchema},
  output: {schema: AnalyzeLogoOutputSchema},
  prompt: `You are a professional brand identity consultant.

  Analyze the following company logo. Provide a brief, constructive critique covering its design principles, color psychology, and overall effectiveness for a professional business.

  Logo: {{media url=logoDataUri}}

  Provide the analysis as a single paragraph.
  `, 
});

const analyzeLogoFlow = ai.defineFlow(
  {
    name: 'analyzeLogoFlow',
    inputSchema: AnalyzeLogoInputSchema,
    outputSchema: AnalyzeLogoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
