import { verifyToken } from '../services/jwtService.js';
import { getRequestToken } from '../utils/authToken.js';

export function verifyWorkerJWT(req, res, next) {
  try {
    const token = getRequestToken(req, 'worker_token');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (decoded?.type !== 'worker') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.worker = decoded;
    return next();
  } catch (_err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
