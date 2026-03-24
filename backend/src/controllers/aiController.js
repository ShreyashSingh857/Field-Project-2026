// backend/src/controllers/aiController.js
import { analyzeWasteImage } from '../services/aiService.js';

/**
 * POST /api/ai/scan
 * Accepts multipart/form-data with a `photo` field (image file).
 * Returns waste identification and disposal instructions from Gemini.
 */
export async function scanWaste(req, res) {
  try {
    // multer puts the file on req.file
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded. Send a multipart/form-data request with a "photo" field.' });
    }

    const { buffer, mimetype } = req.file;

    // Validate it is actually an image
    if (!mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Uploaded file must be an image.' });
    }

    // Call Gemini via aiService
    const result = await analyzeWasteImage(buffer, mimetype);

    return res.status(200).json(result);
  } catch (err) {
    console.error('[AI Scan Error]', err?.message || err);
    return res.status(500).json({
      error: 'AI analysis failed. Please try again.',
    });
  }
}
