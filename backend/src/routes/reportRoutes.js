// backend/src/routes/reportRoutes.js
import express from 'express';
import multer from 'multer';
import { createIssue, getIssues } from '../controllers/reportController.js';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// The frontend requires these multipart field names
router.post(
  '/', 
  verifySupabaseAuth, 
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'audio_file', maxCount: 1 }]), 
  createIssue
);
router.get('/', verifySupabaseAuth, getIssues);

export default router;
