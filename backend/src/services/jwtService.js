import jwt from 'jsonwebtoken';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}
const secret = process.env.JWT_SECRET;
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}
