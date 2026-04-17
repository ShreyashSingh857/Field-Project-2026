// backend/src/routes/reportRoutes.js
import express from 'express';
import multer from 'multer';
import { createIssue, getIssues, updateIssue } from '../controllers/reportController.js';
import { validateBody } from '../middleware/validateRequest.js';
import { verifyToken } from '../services/jwtService.js';
import { verifySupabaseAuth } from '../middleware/verifySupabaseAuth.js';
import { getRequestToken } from '../utils/authToken.js';
import { issueCreateSchema, issueUpdateSchema } from '../validation/schemas.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const verifyIssueAccess = async (req, res, next) => {
  const token = getRequestToken(req);
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

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
  validateBody(issueCreateSchema),
  createIssue
);
router.get('/', verifyIssueAccess, getIssues);
router.patch('/:id', verifyIssueAccess, validateBody(issueUpdateSchema), updateIssue);

export default router;
