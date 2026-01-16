/**
 * OCR Extraction Service for ITR Documents
 * Extracts data from Form 16 PDF using OpenAI Vision API or Tesseract
 */

interface OCRResult {
  name?: string;
  pan?: string;
  employerTAN?: string;
  grossSalary?: number;
  tdsAmount?: number;
  allowances?: {
    houseRentAllowance?: number;
    transportAllowance?: number;
    medicalAllowance?: number;
    other?: number;
  };
  deductions?: {
    section80C?: number;
    section80D?: number;
    section80G?: number;
    section24?: number;
    other?: number;
  };
  financialYear?: string;
  assessmentYear?: string;
  extractedAt: Date;
}

/**
 * Extract data from Form 16 PDF using OpenAI Vision API
 */
export async function extractForm16DataWithOpenAI(
  fileUrl: string,
  fileBuffer?: Buffer
): Promise<OCRResult> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  try {
    // Convert PDF/Image to base64 for OpenAI Vision API
    let base64Image: string;
    
    if (fileBuffer) {
      base64Image = fileBuffer.toString('base64');
    } else {
      // Fetch the file from URL
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    }

    const mimeType = fileUrl.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or 'gpt-4-vision-preview'
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract the following information from this Form 16 document in JSON format:
{
  "name": "Employee name",
  "pan": "PAN number (10 characters)",
  "employerTAN": "Employer TAN (10 characters)",
  "grossSalary": number (total gross salary),
  "tdsAmount": number (total TDS deducted),
  "allowances": {
    "houseRentAllowance": number,
    "transportAllowance": number,
    "medicalAllowance": number,
    "other": number
  },
  "deductions": {
    "section80C": number,
    "section80D": number,
    "section80G": number,
    "section24": number,
    "other": number
  },
  "financialYear": "YYYY-YY format",
  "assessmentYear": "YYYY-YY format"
}

Return only valid JSON, no markdown formatting. If a field is not found, use null.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await openaiResponse.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    // Parse JSON response (remove markdown if present)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const extracted = JSON.parse(jsonMatch[0]);

    return {
      name: extracted.name || undefined,
      pan: extracted.pan || undefined,
      employerTAN: extracted.employerTAN || undefined,
      grossSalary: extracted.grossSalary ? Number(extracted.grossSalary) : undefined,
      tdsAmount: extracted.tdsAmount ? Number(extracted.tdsAmount) : undefined,
      allowances: {
        houseRentAllowance: extracted.allowances?.houseRentAllowance ? Number(extracted.allowances.houseRentAllowance) : undefined,
        transportAllowance: extracted.allowances?.transportAllowance ? Number(extracted.allowances.transportAllowance) : undefined,
        medicalAllowance: extracted.allowances?.medicalAllowance ? Number(extracted.allowances.medicalAllowance) : undefined,
        other: extracted.allowances?.other ? Number(extracted.allowances.other) : undefined,
      },
      deductions: {
        section80C: extracted.deductions?.section80C ? Number(extracted.deductions.section80C) : undefined,
        section80D: extracted.deductions?.section80D ? Number(extracted.deductions.section80D) : undefined,
        section80G: extracted.deductions?.section80G ? Number(extracted.deductions.section80G) : undefined,
        section24: extracted.deductions?.section24 ? Number(extracted.deductions.section24) : undefined,
        other: extracted.deductions?.other ? Number(extracted.deductions.other) : undefined,
      },
      financialYear: extracted.financialYear || undefined,
      assessmentYear: extracted.assessmentYear || undefined,
      extractedAt: new Date(),
    };
  } catch (error: any) {
    console.error('OCR extraction error:', error);
    throw new Error(`Failed to extract data from Form 16: ${error.message}`);
  }
}

/**
 * Validate and normalize PAN format
 */
export function normalizePAN(pan: string | undefined): string | undefined {
  if (!pan) return undefined;
  const cleaned = pan.toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
  return cleaned.length === 10 ? cleaned : undefined;
}

/**
 * Validate and normalize TAN format
 */
export function normalizeTAN(tan: string | undefined): string | undefined {
  if (!tan) return undefined;
  const cleaned = tan.toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9]/g, '');
  return cleaned.length === 10 ? cleaned : undefined;
}

