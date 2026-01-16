/**
 * Form 26AS PDF Parser
 * Parses Form 26AS PDF to extract TDS, advance tax, and other details
 */

interface Form26ASData {
  pan: string;
  financialYear: string;
  tds: {
    total: number;
    details: Array<{
      deductorName: string;
      deductorTAN: string;
      section: string;
      amount: number;
      date: string;
    }>;
  };
  advanceTax: {
    total: number;
    details: Array<{
      date: string;
      amount: number;
      challanNumber: string;
    }>;
  };
  selfAssessmentTax: {
    total: number;
    details: Array<{
      date: string;
      amount: number;
      challanNumber: string;
    }>;
  };
  taxCollectedAtSource: {
    total: number;
    details: Array<{
      collectorName: string;
      amount: number;
      date: string;
    }>;
  };
}

interface Parsed26AS {
  pan: string;
  financialYear: string;
  totalTDS: number;
  totalAdvanceTax: number;
  totalSelfAssessmentTax: number;
  totalTCS: number;
  tdsDetails: Array<{
    deductorName: string;
    deductorTAN: string;
    section: string;
    amount: number;
    date: string;
  }>;
  advanceTaxDetails: Array<{
    date: string;
    amount: number;
    challanNumber: string;
  }>;
  selfAssessmentTaxDetails: Array<{
    date: string;
    amount: number;
    challanNumber: string;
  }>;
}

/**
 * Parse Form 26AS PDF using OpenAI Vision API
 * 
 * Note: In production, you may want to use a specialized PDF parser library
 * or Income Tax Portal API if available
 */
export async function parseForm26ASWithOpenAI(
  fileUrl: string,
  fileBuffer?: Buffer
): Promise<Parsed26AS> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  try {
    // Convert PDF to base64 for OpenAI Vision API
    let base64Image: string;
    
    if (fileBuffer) {
      base64Image = fileBuffer.toString('base64');
    } else {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      base64Image = Buffer.from(arrayBuffer).toString('base64');
    }

    // Call OpenAI Vision API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Extract the following information from this Form 26AS document in JSON format:
{
  "pan": "PAN number",
  "financialYear": "YYYY-YY format",
  "tds": {
    "total": number,
    "details": [
      {
        "deductorName": "Name of deductor",
        "deductorTAN": "TAN of deductor",
        "section": "Section code (e.g., 192, 194A)",
        "amount": number,
        "date": "DD-MM-YYYY"
      }
    ]
  },
  "advanceTax": {
    "total": number,
    "details": [
      {
        "date": "DD-MM-YYYY",
        "amount": number,
        "challanNumber": "Challan number"
      }
    ]
  },
  "selfAssessmentTax": {
    "total": number,
    "details": [
      {
        "date": "DD-MM-YYYY",
        "amount": number,
        "challanNumber": "Challan number"
      }
    ]
  },
  "taxCollectedAtSource": {
    "total": number,
    "details": [
      {
        "collectorName": "Name of collector",
        "amount": number,
        "date": "DD-MM-YYYY"
      }
    ]
  }
}

Return only valid JSON, no markdown formatting. If a field is not found, use null or empty array.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 3000,
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

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }

    const extracted: Form26ASData = JSON.parse(jsonMatch[0]);

    return {
      pan: extracted.pan || '',
      financialYear: extracted.financialYear || '',
      totalTDS: extracted.tds?.total || extracted.tds?.details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
      totalAdvanceTax: extracted.advanceTax?.total || extracted.advanceTax?.details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
      totalSelfAssessmentTax: extracted.selfAssessmentTax?.total || extracted.selfAssessmentTax?.details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
      totalTCS: extracted.taxCollectedAtSource?.total || extracted.taxCollectedAtSource?.details?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0,
      tdsDetails: extracted.tds?.details?.map(item => ({
        deductorName: item.deductorName || 'Unknown',
        deductorTAN: item.deductorTAN || '',
        section: item.section || '',
        amount: item.amount || 0,
        date: item.date || '',
      })) || [],
      advanceTaxDetails: extracted.advanceTax?.details?.map(item => ({
        date: item.date || '',
        amount: item.amount || 0,
        challanNumber: item.challanNumber || '',
      })) || [],
      selfAssessmentTaxDetails: extracted.selfAssessmentTax?.details?.map(item => ({
        date: item.date || '',
        amount: item.amount || 0,
        challanNumber: item.challanNumber || '',
      })) || [],
    };
  } catch (error: any) {
    console.error('Form 26AS parsing error:', error);
    throw new Error(`Failed to parse Form 26AS: ${error.message}`);
  }
}

