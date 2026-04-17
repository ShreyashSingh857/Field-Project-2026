import twilio from 'twilio';

let cachedClient = null;

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  return {
    accountSid,
    authToken,
    from,
    enabled: Boolean(accountSid && authToken && from),
  };
}

function getClient() {
  if (cachedClient) return cachedClient;

  const { accountSid, authToken } = getTwilioConfig();
  if (!accountSid || !authToken) return null;

  cachedClient = twilio(accountSid, authToken);
  return cachedClient;
}

export function normalizePhoneForWhatsApp(phone) {
  if (!phone) return null;

  const cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.startsWith('0')) return `+91${cleaned.slice(1)}`;
  if (cleaned.length === 10) return `+91${cleaned}`;
  return `+${cleaned}`;
}

function ensureWhatsAppPrefix(value) {
  if (!value) return null;
  return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`;
}

export async function sendWhatsAppMessage({ to, body, contentSid, contentVariables }) {
  const config = getTwilioConfig();
  if (!config.enabled) {
    return { skipped: true, reason: 'Twilio WhatsApp is not configured' };
  }

  if (!body && !contentSid) {
    return { skipped: true, reason: 'Either body or contentSid is required' };
  }

  const normalizedTo = normalizePhoneForWhatsApp(to);
  if (!normalizedTo) {
    return { skipped: true, reason: 'Invalid destination phone' };
  }

  const client = getClient();
  if (!client) {
    return { skipped: true, reason: 'Twilio client unavailable' };
  }

  const messagePayload = {
    from: ensureWhatsAppPrefix(config.from),
    to: ensureWhatsAppPrefix(normalizedTo),
    ...(body ? { body } : {}),
    ...(contentSid ? { contentSid } : {}),
    ...(contentSid && contentVariables ? { contentVariables: JSON.stringify(contentVariables) } : {}),
  };

  const response = await client.messages.create(messagePayload);

  return { skipped: false, sid: response.sid };
}

export async function sendWhatsAppSafely({ to, body, contentSid, contentVariables, tag = 'whatsapp' }) {
  try {
    return await sendWhatsAppMessage({ to, body, contentSid, contentVariables });
  } catch (error) {
    console.warn(`[${tag}] WhatsApp send failed:`, error.message);
    return { skipped: true, reason: error.message };
  }
}
