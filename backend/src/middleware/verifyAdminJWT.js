import { verifyToken } from '../services/jwtService.js';

export function verifyAdminJWT(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(auth.slice(7));
    if (decoded?.type !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.admin = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
