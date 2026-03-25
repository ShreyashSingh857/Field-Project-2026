import OpenAI, { toFile } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const transcribeAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Convert multer memory buffer into an OpenAI-compatible File object
    const file = await toFile(req.file.buffer, 'audio.webm', { type: 'audio/webm' });

    const response = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error('OpenAI Whisper Error:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
};
