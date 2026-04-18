export function getRequestToken(req, preferredCookieName) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }

  if (preferredCookieName && req.cookies?.[preferredCookieName]) {
    return req.cookies[preferredCookieName];
  }

  return req.cookies?.admin_token
    || req.cookies?.worker_token
    || req.cookies?.user_token
    || '';
}
