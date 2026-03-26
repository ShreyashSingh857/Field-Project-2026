import { verifyToken } from '../services/jwtService.js';

export function verifyWorkerJWT(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(auth.slice(7));
    if (decoded?.type !== 'worker') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.worker = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
