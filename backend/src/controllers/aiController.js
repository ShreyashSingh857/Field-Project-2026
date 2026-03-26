import OpenAI, { toFile } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { analyzeWasteImage } from '../services/aiService.js';
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
    const result = await analyzeWasteImage(req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err) {
    console.error('Gemini Vision Error:', err);
    res.status(500).json({ error: 'Failed to analyze waste' });
  }
};
