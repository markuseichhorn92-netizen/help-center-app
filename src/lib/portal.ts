import { kv } from "@vercel/kv";
import { v4 as uuidv4 } from "uuid";

// ============================================
// TYPES
// ============================================

export interface PortalToken {
  [key: string]: string | boolean | undefined;
  token: string;
  email: string;
  ticketId?: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface PortalSession {
  [key: string]: string;
  sessionId: string;
  email: string;
  createdAt: string;
  lastActive: string;
  expiresAt: string;
}

export interface SessionActivity {
  [key: string]: string | number | boolean | undefined;
  startedAt: string;
  lastActivity: string;
  messagesExchanged: number;
  lastMessageAt?: string;
  emailSent: boolean;
}

export interface CustomerPresence {
  [key: string]: string | undefined;
  lastSeen: string;
  ticketId?: string;
}

// ============================================
// CONSTANTS
// ============================================

const TOKEN_EXPIRY_DAYS = 7;
const SESSION_EXPIRY_HOURS = 24;
const RATE_LIMIT_REQUESTS = 3;
const RATE_LIMIT_WINDOW_HOURS = 1;
const ADMIN_ONLINE_THRESHOLD_SECONDS = 60;
const CUSTOMER_ONLINE_THRESHOLD_SECONDS = 60;

// ============================================
// TOKEN MANAGEMENT
// ============================================

/**
 * Generate a portal access token for a customer
 */
export async function generatePortalToken(
  email: string,
  ticketId?: string
): Promise<PortalToken> {
  const token = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const portalToken: PortalToken = {
    token,
    email: email.toLowerCase(),
    ticketId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false,
  };

  // Store token
  await kv.hset(`portal:token:${token}`, portalToken);

  // Set expiry on the key
  await kv.expire(`portal:token:${token}`, TOKEN_EXPIRY_DAYS * 24 * 60 * 60);

  // Add to email's token set (for cleanup)
  await kv.sadd(`portal:tokens:email:${email.toLowerCase()}`, token);

  return portalToken;
}

/**
 * Verify and consume a portal token
 */
export async function verifyPortalToken(token: string): Promise<PortalToken | null> {
  const data = await kv.hgetall<PortalToken>(`portal:token:${token}`);

  if (!data) {
    return null;
  }

  // Check expiry
  if (new Date(data.expiresAt) < new Date()) {
    await kv.del(`portal:token:${token}`);
    return null;
  }

  // Mark as used (but don't invalidate - allow multiple uses within expiry)
  if (!data.used) {
    await kv.hset(`portal:token:${token}`, { used: true });
  }

  return data;
}

/**
 * Check rate limit for magic link requests
 */
export async function checkRateLimit(email: string): Promise<boolean> {
  const key = `portal:ratelimit:${email.toLowerCase()}`;
  const requests = await kv.get<number>(key) || 0;

  if (requests >= RATE_LIMIT_REQUESTS) {
    return false; // Rate limited
  }

  // Increment counter
  await kv.incr(key);

  // Set expiry if first request
  if (requests === 0) {
    await kv.expire(key, RATE_LIMIT_WINDOW_HOURS * 60 * 60);
  }

  return true;
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Create a new portal session
 */
export async function createPortalSession(email: string): Promise<PortalSession> {
  const sessionId = uuidv4();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

  const session: PortalSession = {
    sessionId,
    email: email.toLowerCase(),
    createdAt: now.toISOString(),
    lastActive: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  // Store session
  await kv.hset(`portal:session:${sessionId}`, session);

  // Set expiry
  await kv.expire(`portal:session:${sessionId}`, SESSION_EXPIRY_HOURS * 60 * 60);

  // Add to email's session set
  await kv.sadd(`portal:sessions:email:${email.toLowerCase()}`, sessionId);

  return session;
}

/**
 * Verify a portal session
 */
export async function verifyPortalSession(sessionId: string): Promise<PortalSession | null> {
  const data = await kv.hgetall<PortalSession>(`portal:session:${sessionId}`);

  if (!data) {
    return null;
  }

  // Check expiry
  if (new Date(data.expiresAt) < new Date()) {
    await kv.del(`portal:session:${sessionId}`);
    return null;
  }

  // Update last active
  await kv.hset(`portal:session:${sessionId}`, {
    lastActive: new Date().toISOString()
  });

  return data;
}

/**
 * Delete a portal session (logout)
 */
export async function deletePortalSession(sessionId: string): Promise<void> {
  const session = await kv.hgetall<PortalSession>(`portal:session:${sessionId}`);

  if (session) {
    await kv.srem(`portal:sessions:email:${session.email}`, sessionId);
    await kv.del(`portal:session:${sessionId}`);
  }
}

// ============================================
// ADMIN PRESENCE
// ============================================

/**
 * Update admin online status (heartbeat)
 */
export async function updateAdminPresence(): Promise<void> {
  await kv.set("admin:online", Date.now().toString());
  await kv.expire("admin:online", ADMIN_ONLINE_THRESHOLD_SECONDS * 2);
}

/**
 * Check if admin is currently online
 */
export async function isAdminOnline(): Promise<boolean> {
  const timestamp = await kv.get<string>("admin:online");

  if (!timestamp) {
    return false;
  }

  const lastActive = parseInt(timestamp, 10);
  const now = Date.now();

  return (now - lastActive) < ADMIN_ONLINE_THRESHOLD_SECONDS * 1000;
}

// ============================================
// CUSTOMER PRESENCE
// ============================================

/**
 * Update customer presence (heartbeat from portal)
 */
export async function updateCustomerPresence(
  email: string,
  ticketId?: string
): Promise<void> {
  const key = `portal:presence:${email.toLowerCase()}`;
  const presence: CustomerPresence = {
    lastSeen: new Date().toISOString(),
    ticketId,
  };

  await kv.hset(key, presence);
  await kv.expire(key, CUSTOMER_ONLINE_THRESHOLD_SECONDS * 2);
}

/**
 * Get customer presence status
 */
export async function getCustomerPresence(email: string): Promise<{
  online: boolean;
  lastSeen: string | null;
  ticketId?: string;
}> {
  const key = `portal:presence:${email.toLowerCase()}`;
  const data = await kv.hgetall<CustomerPresence>(key);

  if (!data || !data.lastSeen) {
    return { online: false, lastSeen: null };
  }

  const lastSeenTime = new Date(data.lastSeen).getTime();
  const now = Date.now();
  const online = (now - lastSeenTime) < CUSTOMER_ONLINE_THRESHOLD_SECONDS * 1000;

  return {
    online,
    lastSeen: data.lastSeen,
    ticketId: data.ticketId,
  };
}

// ============================================
// SESSION ACTIVITY TRACKING
// ============================================

/**
 * Track session activity for exit handling
 */
export async function trackSessionActivity(
  email: string,
  ticketId: string
): Promise<SessionActivity> {
  const key = `portal:active-session:${email.toLowerCase()}:${ticketId}`;
  const existing = await kv.hgetall<SessionActivity>(key);

  if (existing) {
    // Update last activity
    await kv.hset(key, { lastActivity: new Date().toISOString() });
    return existing;
  }

  // Create new session activity
  const activity: SessionActivity = {
    startedAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    messagesExchanged: 0,
    emailSent: false,
  };

  await kv.hset(key, activity);
  await kv.expire(key, 24 * 60 * 60); // 24 hours

  return activity;
}

/**
 * Increment message count for session
 */
export async function incrementSessionMessages(
  email: string,
  ticketId: string
): Promise<void> {
  const key = `portal:active-session:${email.toLowerCase()}:${ticketId}`;

  await kv.hincrby(key, "messagesExchanged", 1);
  await kv.hset(key, {
    lastActivity: new Date().toISOString(),
    lastMessageAt: new Date().toISOString(),
  });
}

/**
 * Mark session summary email as sent
 */
export async function markSessionEmailSent(
  email: string,
  ticketId: string
): Promise<void> {
  const key = `portal:active-session:${email.toLowerCase()}:${ticketId}`;
  await kv.hset(key, { emailSent: true });
}

/**
 * Get session activity
 */
export async function getSessionActivity(
  email: string,
  ticketId: string
): Promise<SessionActivity | null> {
  const key = `portal:active-session:${email.toLowerCase()}:${ticketId}`;
  return await kv.hgetall<SessionActivity>(key);
}

/**
 * Clear session activity
 */
export async function clearSessionActivity(
  email: string,
  ticketId: string
): Promise<void> {
  const key = `portal:active-session:${email.toLowerCase()}:${ticketId}`;
  await kv.del(key);
}

// ============================================
// RESPONSE TIME ESTIMATION
// ============================================

/**
 * Record admin response time
 */
export async function recordResponseTime(seconds: number): Promise<void> {
  const key = "analytics:response-times";
  const hour = new Date().getHours();

  // Store response time with timestamp
  await kv.lpush(key, JSON.stringify({
    seconds,
    hour,
    timestamp: Date.now(),
  }));

  // Keep only last 1000 entries
  await kv.ltrim(key, 0, 999);
}

/**
 * Get estimated response time
 */
export async function getEstimatedResponseTime(): Promise<number | null> {
  const key = "analytics:response-times";
  const entries = await kv.lrange<string>(key, 0, 99);

  if (!entries || entries.length === 0) {
    return null;
  }

  const times = entries.map(e => {
    const parsed = typeof e === 'string' ? JSON.parse(e) : e;
    return parsed.seconds;
  });

  // Calculate average
  const sum = times.reduce((a, b) => a + b, 0);
  return Math.round(sum / times.length);
}

// ============================================
// TICKET RATING
// ============================================

export interface TicketRating {
  [key: string]: string | number | undefined;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
}

/**
 * Save ticket rating
 */
export async function saveTicketRating(
  ticketId: string,
  rating: number,
  comment?: string
): Promise<TicketRating> {
  const data: TicketRating = {
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };

  await kv.hset(`ticket:${ticketId}:rating`, data);

  return data;
}

/**
 * Get ticket rating
 */
export async function getTicketRating(ticketId: string): Promise<TicketRating | null> {
  return await kv.hgetall<TicketRating>(`ticket:${ticketId}:rating`);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate ticket number format
 */
export function isValidTicketNumber(ticketNumber: string): boolean {
  return /^TKT-\d+$/i.test(ticketNumber);
}

/**
 * Sanitize HTML content (basic)
 */
export function sanitizeHtml(html: string): string {
  // Remove script tags
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove style tags
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, "");
  sanitized = sanitized.replace(/\s*on\w+='[^']*'/gi, "");

  return sanitized;
}
