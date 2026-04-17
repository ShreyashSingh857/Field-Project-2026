import 'dotenv/config';
import { validateEnv } from './config/validateEnv.js';
import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import binsRoutes from './routes/binsRoutes.js';
import recyclingRoutes from './routes/recyclingRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import marketplaceRoutes from './routes/marketplaceRoutes.js';
import userRoutes from './routes/userRoutes.js';
import escalationRoutes from './routes/escalationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import workerRoutes from './routes/workerRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { buildOperationalSummary } from './services/reportingService.js';

validateEnv();

const app = express();
const port = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  process.env.USER_APP_URL,
  process.env.ADMIN_APP_URL,
  process.env.WORKER_APP_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
].filter(Boolean);

// ── Security & parsing ──────────────────────────────────────
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ── Rate limiting ───────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 600 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  message: { error: 'Too many API requests. Please wait and retry.' },
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
app.use('/api/bins', binsRoutes);
app.use('/api/recycling-centers', recyclingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/issues', reportRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/notifications', notificationRoutes);
app.get('/api/reports', async (_req, res, next) => {
  try {
    const summary = await buildOperationalSummary();
    res.json({ reports: [], summary });
  } catch (err) {
    next(err);
  }
});

// ── Global error handler ────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  } else {
    console.error('[Error]', err?.message);
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
  }
  res.status(500).json({ error: err?.message || 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
