import express from 'express';
import multer from 'multer';
import { transcribeAudio } from '../controllers/aiController.js';

const router = express.Router();

// Memory storage keeps the lightweight audio file in a Buffer
const upload = multer({ storage: multer.memoryStorage() });

router.post('/transcribe', upload.single('audio'), transcribeAudio);

export default router;
