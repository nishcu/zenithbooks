import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Check if API key is configured
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY is not configured. AI features will not work.');
  console.warn('   Please set GEMINI_API_KEY in your environment variables.');
  console.warn('   Get your API key from: https://aistudio.google.com/');
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey || 'dummy-key-for-initialization'})],
  model: 'googleai/gemini-2.5-flash',
});
