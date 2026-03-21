import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';

const app = express();
const port = Number(process.env.PORT || 5000);
const userOrigin = process.env.USER_APP_URL || 'http://localhost:5173';

app.use(cors({ origin: [userOrigin], credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
