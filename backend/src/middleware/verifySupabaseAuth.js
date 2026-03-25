// backend/src/middleware/verifySupabaseAuth.js
import { supabaseAdmin } from '../config/supabase.js';

export async function verifySupabaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user; // { id, email, phone, user_metadata, ... }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}
