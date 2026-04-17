import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('health route', () => {
  it('returns ok true', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-key';
    const { default: app } = await import('../src/server.js');

    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
