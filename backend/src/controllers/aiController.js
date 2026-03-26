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

export const chatWithAssistant = async (req, res) => {
  try {
    const { message, history = [], language = 'en' } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `You are a helpful waste management assistant for rural villages in India. Answer questions about waste disposal, recycling, composting, and sanitation in simple, friendly language. Keep answers concise and practical. Always respond in ${language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English'}.`,
    });

    // Convert history to Gemini format
    const chatHistory = history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to get response' });
  }
};
