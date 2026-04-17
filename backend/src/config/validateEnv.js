const REQUIRED = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET', 'ADMIN_API_KEY', 'SENSOR_API_KEY',
  'GEMINI_API_KEY', 'OPENAI_API_KEY',
];

export function validateEnv() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error('FATAL: Missing required environment variables:\n  ' + missing.join('\n  '));
    process.exit(1);
  }
}
