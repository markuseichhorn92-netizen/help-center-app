import { createClient } from '@vercel/kv';

// Shared Vercel KV client. Centralizes connection config so credentials and
// options live in one place instead of being re-instantiated in every module.
export const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});
