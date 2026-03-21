const q = (o) => new URLSearchParams(o).toString();

const cfg = () => {
  const { SUPABASE_URL, USER_APP_URL, BACKEND_BASE_URL } = process.env;
  if (!SUPABASE_URL || !USER_APP_URL || !BACKEND_BASE_URL) {
    throw new Error('Missing OAuth env vars');
  }
  return { SUPABASE_URL, USER_APP_URL, BACKEND_BASE_URL };
};

export const getUserGoogleAuthUrl = (req, res) => {
  try {
    const { SUPABASE_URL, USER_APP_URL } = cfg();
    const redirectTo = req.query.redirect_to || `${USER_APP_URL}/dashboard`;
    const url = `${SUPABASE_URL}/auth/v1/authorize?${q({ provider: 'google', redirect_to: redirectTo })}`;
    res.json({ url });
  } catch (e) {
    res.status(500).json({ error: e.message || 'OAuth config error' });
  }
};

export const startUserGoogleAuth = (req, res) => {
  try {
    const { SUPABASE_URL, USER_APP_URL } = cfg();
    const redirectTo = req.query.redirect_to || `${USER_APP_URL}/dashboard`;
    const url = `${SUPABASE_URL}/auth/v1/authorize?${q({ provider: 'google', redirect_to: redirectTo })}`;
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ error: e.message || 'OAuth config error' });
  }
};
