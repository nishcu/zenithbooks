
'use server';

/**
 * @fileOverview An AI agent that extracts structured data from an invoice document (image or PDF).
 *
 * - extractInvoiceData - A function that handles the invoice data extraction.
 * - ExtractInvoiceDataInput - The input type for the function.
 * - ExtractInvoiceDataOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractInvoiceDataInputSchema = z.object({
  invoiceDataUri: z
    .string()
    .describe(
      "A data URI of the invoice document. Must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractInvoiceDataInput = z.infer<typeof ExtractInvoiceDataInputSchema>;

const ExtractInvoiceDataOutputSchema = z.object({
  vendorName: z.string().optional().describe("The name of the vendor or seller."),
  invoiceNumber: z.string().optional().describe("The invoice number or bill number."),
  invoiceDate: z.string().optional().describe("The date of the invoice in YYYY-MM-DD format."),
  totalAmount: z.number().optional().describe("The final total amount of the invoice."),
  buyerGstin: z.string().optional().describe("The GSTIN of the buyer or recipient of the goods/services."),
});
export type ExtractInvoiceDataOutput = z.infer<typeof ExtractInvoiceDataOutputSchema>;

export async function extractInvoiceData(input: ExtractInvoiceDataInput): Promise<ExtractInvoiceDataOutput> {
  return extractInvoiceDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractInvoiceDataPrompt',
  input: {schema: ExtractInvoiceDataInputSchema},
  output: {schema: ExtractInvoiceDataOutputSchema},
  prompt: `You are an expert data extraction agent.

  Analyze the following document image and extract the key details of the invoice.

  Document: {{media url=invoiceDataUri}}

  Extract the following fields:
  - Vendor Name
  - Invoice Number
  - Invoice Date (in YYYY-MM-DD format)
  - Total Amount
  - Buyer's GSTIN (the GSTIN of the entity to whom the invoice is issued)
  `, 
});

const extractInvoiceDataFlow = ai.defineFlow(
  {
    name: 'extractInvoiceDataFlow',
    inputSchema: ExtractInvoiceDataInputSchema,
    outputSchema: ExtractInvoiceDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
