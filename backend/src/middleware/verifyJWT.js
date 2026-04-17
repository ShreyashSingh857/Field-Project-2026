import { verifyToken } from '../services/jwtService.js';
import { getRequestToken } from '../utils/authToken.js';

export function verifyJWT(req, res, next) {
	const token = getRequestToken(req);
	if (!token) return res.status(401).json({ error: 'Missing token' });
	try {
		req.user = verifyToken(token);
		return next();
	} catch {
		return res.status(401).json({ error: 'Invalid or expired token' });
	}
}
