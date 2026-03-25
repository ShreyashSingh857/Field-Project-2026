// backend/src/services/aiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY in .env');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a waste management expert for rural India.
When shown an image of waste, identify what kind of waste it is and provide
clear, numbered, step-by-step disposal instructions in simple language that
a rural villager can follow. Be practical and specific.
Always respond strictly in the following JSON format with no markdown, 
no code fences, no extra explanation — only raw JSON:
{
  "waste_type": "<specific name of the waste item>",
  "category": "<one of: Dry Waste | Wet Waste | Hazardous | Recyclable | Compostable | General Waste>",
  "steps": [
    "<step 1>",
    "<step 2>",
    "<step 3>",
    "<step 4>",
    "<step 5>"
  ],
  "tip": "<one practical tip about recycling or reuse value of this waste>"
}`;

// Use gemini-2.5-flash — fast, cheap, supports vision
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-flash',
  systemInstruction: SYSTEM_PROMPT
});

/**
 * Analyze a waste image using Gemini Vision.
 * @param {Buffer} imageBuffer - Raw image bytes from multer
 * @param {string} mimeType - e.g. 'image/jpeg', 'image/png'
 * @returns {Promise<{ waste_type, category, steps, tip }>}
 */
export async function analyzeWasteImage(imageBuffer, mimeType) {
  // Convert buffer to base64
  const base64Image = imageBuffer.toString('base64');

  // Build the multimodal prompt: image + instruction
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Image,
      },
    },
    'Identify this waste item and tell me exactly how to dispose of it properly.',
  ]);

  const raw = result.response.text().trim();

  // Strip any accidental markdown code fences if Gemini adds them
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // If Gemini returned malformed JSON, return a safe fallback
    return {
      waste_type: 'Unknown waste',
      category: 'General Waste',
      steps: [
        'Do not litter. Keep the waste contained.',
        'Take it to the nearest collection point in your village.',
        'Ask your Safai Mitra for guidance on proper disposal.',
      ],
      tip: 'When in doubt, hand waste to your local Safai Mitra or Gram Panchayat collection point.',
    };
  }

  // Validate and sanitize the parsed response
  return {
    waste_type: String(parsed.waste_type || 'Unknown'),
    category: String(parsed.category || 'General Waste'),
    steps: Array.isArray(parsed.steps) ? parsed.steps.map(String) : [],
    tip: String(parsed.tip || ''),
  };
}
