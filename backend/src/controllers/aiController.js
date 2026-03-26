import OpenAI, { toFile } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { analyzeWasteImage } from '../services/aiService.js';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const LANGUAGE_NAME = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
};

const WASTE_KEYWORDS = [
  'waste', 'garbage', 'trash', 'recycle', 'recycling', 'compost', 'bin', 'litter', 'plastic',
  'wet waste', 'dry waste', 'hazardous', 'sanitation', 'cleanliness', 'segregation', 'landfill',
  'kachra', 'kachara', 'safai', 'swachh', 'geela', 'sukha', 'olya', 'suka', 'kachrya',
];

function isWasteRelated(text = '') {
  const normalized = String(text).toLowerCase();
  return WASTE_KEYWORDS.some((k) => normalized.includes(k));
}

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

    const selectedLanguage = LANGUAGE_NAME[language] ? language : 'en';
    const latestMessage = String(message).trim();

    const wasteRelated = isWasteRelated(latestMessage);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are a waste-management assistant for rural India.
    Primary focus is waste disposal, recycling, composting, sanitation, bins, litter, and cleanliness drives.
    You may answer greetings and simple general questions naturally.
    If a question is outside waste management, give a short helpful answer and gently steer the user back to waste-management help.
Keep responses practical, concise, and village-friendly with simple steps.
Always respond in ${LANGUAGE_NAME[selectedLanguage]}.`,
    });

    // Convert recent history to Gemini format
    const chatHistory = history.slice(-10).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(latestMessage);
    let reply = result.response.text();

    if (!wasteRelated) {
      const suffix = selectedLanguage === 'hi'
        ? '\n\nअगर आप चाहें, तो मैं कचरा अलग करने, रीसाइक्लिंग या स्वच्छता से जुड़े सवालों में भी मदद कर सकता हूं।'
        : selectedLanguage === 'mr'
          ? '\n\nतुम्हाला हवे असल्यास मी कचरा वर्गीकरण, पुनर्वापर किंवा स्वच्छतेबाबतही मदत करू शकतो.'
          : '\n\nIf you want, I can also help with waste segregation, recycling, or sanitation.';
      reply = `${reply}${suffix}`;
    }

    res.json({ reply });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Failed to get response' });
  }
};
