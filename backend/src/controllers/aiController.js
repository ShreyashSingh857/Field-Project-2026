import OpenAI, { toFile } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const { originalname, buffer } = req.file;
    const file = await toFile(buffer, originalname, { type: req.file.mimetype });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('OpenAI Whisper Error:', error.message || error);
    res.status(500).json({ 
      error: 'Failed to transcribe audio', 
      details: error.response?.data?.error?.message || error.message || String(error)
    });
  }
};

export const scanWaste = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { buffer, mimetype } = req.file;
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      Analyze this image of waste and return ONLY a raw JSON object. Do not use markdown blocks.
      Requirements:
      - "waste_type": A short specific name for the waste item (e.g. "Plastic Bottle").
      - "category": Must be one of ["Recyclable", "Compostable", "Hazardous", "General Waste"].
      - "steps": An array of short strings providing step-by-step disposal tips.
      - "tip": A single short string about where to dispose of it (e.g. "Throw in blue bin").
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mimetype,
        },
      },
    ]);

    const textPayload = result.response.text().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(textPayload);

    res.json(parsed);
  } catch (err) {
    console.error('Gemini Vision Error:', err);
    res.status(500).json({ error: 'Failed to analyze waste' });
  }
};
