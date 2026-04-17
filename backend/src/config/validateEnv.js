const REQUIRED = [
  'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET', 'ADMIN_API_KEY', 'SENSOR_API_KEY',
  'GEMINI_API_KEY', 'OPENAI_API_KEY',
];

const TWILIO_GROUP = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM'];

export function validateEnv() {
  if (process.env.NODE_ENV === 'test') return;

  const missing = REQUIRED.filter((k) => !process.env[k]);
  const twilioPresent = TWILIO_GROUP.filter((k) => process.env[k]);

  if (twilioPresent.length > 0 && twilioPresent.length < TWILIO_GROUP.length) {
    const twilioMissing = TWILIO_GROUP.filter((k) => !process.env[k]);
    console.error('FATAL: Partial Twilio configuration detected. Missing:\n  ' + twilioMissing.join('\n  '));
    process.exit(1);
  }

  if (missing.length > 0) {
    console.error('FATAL: Missing required environment variables:\n  ' + missing.join('\n  '));
    process.exit(1);
  }
}
