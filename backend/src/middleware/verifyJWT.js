import { verifyToken } from '../services/jwtService.js';

export function verifyJWT(req, res, next) {
	const auth = req.headers.authorization || '';
	const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
	if (!token) return res.status(401).json({ error: 'Missing token' });
	try {
		req.user = verifyToken(token);
		return next();
	} catch {
		return res.status(401).json({ error: 'Invalid or expired token' });
	}
}
