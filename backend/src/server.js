import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import binsRoutes from './routes/binsRoutes.js';
import recyclingRoutes from './routes/recyclingRoutes.js';
import aiRoute from './routes/aiRoute.js';
import reportRoutes from './routes/reportRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const userOrigin = process.env.USER_APP_URL || 'http://localhost:5173';

// ── Security & parsing ──────────────────────────────────────
app.use(cors({ origin: [userOrigin], credentials: true }));
app.use(express.json());

// ── Rate limiting ───────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});
app.use('/api/ai/', aiLimiter);

// ── Routes ──────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai/speech', aiRoute);
app.use('/api/bins', binsRoutes);
app.use('/api/recycling-centers', recyclingRoutes);
app.use('/api/issues', reportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/users', userRoutes);

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err?.message || err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
  }
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
