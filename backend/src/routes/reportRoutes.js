// backend/src/routes/reportRoutes.js
import express from 'express';
import multer from 'multer';
import { createIssue, getIssues, updateIssue } from '../controllers/reportController.js';
import { verifyToken } from '../services/jwtService.js';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const verifyIssueAccess = async (req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.slice(7);
  try {
    const decoded = verifyToken(token);
    if (decoded?.type === 'admin') {
      req.admin = decoded;
      return next();
    }
  } catch (_e) {
    // fall through to Supabase verification
  }
  return verifySupabaseAuth(req, res, next);
};

// The frontend requires these multipart field names
router.post(
  '/', 
  verifySupabaseAuth, 
  upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'audio_file', maxCount: 1 }]), 
  createIssue
);
router.get('/', verifyIssueAccess, getIssues);
router.patch('/:id', verifyIssueAccess, updateIssue);

export default router;
