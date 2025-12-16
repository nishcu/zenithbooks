
import { config } from 'dotenv';
config();

import '@/ai/flows/compare-gstr-flow.ts';
import '@/ai/flows/reconcile-itc-flow.ts';
import '@/ai/flows/suggest-hsn-codes.ts';
import '@/ai/flows/compare-gstr-reports.ts';
import '@/ai/flows/generate-terms-flow.ts';
import '@/ai/flows/analyze-logo-flow.ts';
import '@/ai/flows/get-cma-observations-flow.ts';
import '@/ai/flows/generate-moa-objects-flow.ts';
import '@/ai/flows/extract-invoice-data-flow.ts';
import '@/ai/flows/suggest-legal-clauses-flow.ts';
