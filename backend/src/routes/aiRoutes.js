// backend/src/routes/aiRoutes.js
import { Router } from 'express';
import multer from 'multer';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { scanWaste, chatWithAssistant, transcribeAudio } from '../controllers/aiController.js';
import { validateBody } from '../middleware/validateRequest.js';
import { aiChatSchema } from '../validation/schemas.js';

const router = Router();

// multer: store file in memory (buffer), max 5MB, images only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// POST /api/ai/scan
// Auth required (Supabase JWT), single image upload
router.post(
  '/scan',
  verifySupabaseAuth,
  upload.single('photo'),
  scanWaste
);

router.post('/chat', verifySupabaseAuth, validateBody(aiChatSchema), chatWithAssistant);
router.post('/speech/transcribe', upload.single('audio'), transcribeAudio);

export default router;
