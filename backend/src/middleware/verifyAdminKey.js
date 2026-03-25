// backend/src/middleware/verifyAdminKey.js
/**
 * Very simple API-key guard for admin write endpoints.
 * The admin app (or curl) must send:
 *   Authorization: Bearer <ADMIN_API_KEY>
 * where ADMIN_API_KEY is set in backend/.env
 */
export function verifyAdminKey(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.warn('[verifyAdminKey] ADMIN_API_KEY is not set — write endpoints are OPEN!');
    return next(); // Warn but allow — prevents accidental lockout during dev
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== adminKey) {
    return res.status(401).json({ error: 'Invalid or missing admin API key' });
  }
  return next();
}
