import { verifyToken } from '../services/jwtService.js';

const ADMIN_ROLES = new Set(['zilla_parishad', 'block_samiti', 'gram_panchayat', 'ward_member']);

export function verifyAdminJWT(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(auth.slice(7));
    const isAdminType = decoded?.type === 'admin';
    const hasAdminRole = ADMIN_ROLES.has(String(decoded?.role || ''));
    if (!isAdminType && !hasAdminRole) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.admin = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
