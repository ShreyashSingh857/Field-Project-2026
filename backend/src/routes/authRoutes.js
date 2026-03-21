import { Router } from 'express';
import { getUserGoogleAuthUrl, startUserGoogleAuth } from '../controllers/authController.js';

const router = Router();

router.get('/user/google/url', getUserGoogleAuthUrl);
router.get('/user/google/start', startUserGoogleAuth);

export default router;
