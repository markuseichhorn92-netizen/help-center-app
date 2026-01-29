import { kv } from '@vercel/kv';

// Disposable email domains to block
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  'throwaway.email',
  'temp-mail.org',
  'fakeinbox.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamail.info',
  'grr.la',
  'spam4.me',
  'tempail.com',
  'dispostable.com',
  'mintemail.com',
  'mohmal.com',
  'emailondeck.com',
];

// Spam keywords that indicate spam content
const SPAM_KEYWORDS = [
  'cryptocurrency',
  'bitcoin investment',
  'earn money fast',
  'work from home opportunity',
  'million dollars',
  'lottery winner',
  'nigerian prince',
  'wire transfer',
  'click here now',
  'act now',
  'limited time offer',
  'free gift',
  'congratulations you won',
  'viagra',
  'cialis',
  'pharmacy online',
  'weight loss miracle',
  'casino bonus',
  'gambling',
  'adult content',
  'xxx',
  'porn',
  'make money online',
  'crypto trading',
  'forex trading',
  'binary options',
];

// KV Keys
const RATE_LIMIT_PREFIX = 'spam:rate:';
const BLOCKLIST_KEY = 'spam:blocklist:emails';
const DOMAIN_BLOCKLIST_KEY = 'spam:blocklist:domains';
const SPAM_LOG_PREFIX = 'spam:log:';

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
  score: number;
  details: {
    rateLimited: boolean;
    blockedEmail: boolean;
    blockedDomain: boolean;
    disposableEmail: boolean;
    spamContent: boolean;
    tooManyLinks: boolean;
    honeypotTriggered: boolean;
  };
}

export interface SpamCheckOptions {
  email: string;
  content?: string;
  subject?: string;
  ip?: string;
  honeypotValue?: string;
  skipRateLimit?: boolean;
}

// Rate limit settings
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds
const RATE_LIMIT_MAX_TICKETS = 5; // Max tickets per hour per email
const RATE_LIMIT_MAX_PER_IP = 10; // Max tickets per hour per IP

/**
 * Main spam check function
 */
export async function checkForSpam(options: SpamCheckOptions): Promise<SpamCheckResult> {
  const { email, content = '', subject = '', ip, honeypotValue, skipRateLimit = false } = options;

  const result: SpamCheckResult = {
    isSpam: false,
    score: 0,
    details: {
      rateLimited: false,
      blockedEmail: false,
      blockedDomain: false,
      disposableEmail: false,
      spamContent: false,
      tooManyLinks: false,
      honeypotTriggered: false,
    },
  };

  // 1. Honeypot check (instant spam if filled)
  if (honeypotValue && honeypotValue.trim() !== '') {
    result.isSpam = true;
    result.reason = 'Bot erkannt';
    result.score = 100;
    result.details.honeypotTriggered = true;
    await logSpamAttempt(email, 'honeypot', ip);
    return result;
  }

  // 2. Check email blocklist
  const emailLower = email.toLowerCase();
  const isEmailBlocked = await isEmailInBlocklist(emailLower);
  if (isEmailBlocked) {
    result.isSpam = true;
    result.reason = 'E-Mail-Adresse blockiert';
    result.score = 100;
    result.details.blockedEmail = true;
    await logSpamAttempt(email, 'blocked_email', ip);
    return result;
  }

  // 3. Check domain blocklist
  const domain = emailLower.split('@')[1];
  const isDomainBlocked = await isDomainInBlocklist(domain);
  if (isDomainBlocked) {
    result.isSpam = true;
    result.reason = 'E-Mail-Domain blockiert';
    result.score = 100;
    result.details.blockedDomain = true;
    await logSpamAttempt(email, 'blocked_domain', ip);
    return result;
  }

  // 4. Check disposable email domains
  if (DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    result.isSpam = true;
    result.reason = 'Wegwerf-E-Mail-Adresse nicht erlaubt';
    result.score = 100;
    result.details.disposableEmail = true;
    await logSpamAttempt(email, 'disposable_email', ip);
    return result;
  }

  // 5. Rate limiting (per email)
  if (!skipRateLimit) {
    const emailRateKey = `${RATE_LIMIT_PREFIX}email:${emailLower}`;
    const emailCount = await kv.incr(emailRateKey);

    if (emailCount === 1) {
      await kv.expire(emailRateKey, RATE_LIMIT_WINDOW);
    }

    if (emailCount > RATE_LIMIT_MAX_TICKETS) {
      result.isSpam = true;
      result.reason = 'Zu viele Anfragen. Bitte warten Sie eine Stunde.';
      result.score = 100;
      result.details.rateLimited = true;
      await logSpamAttempt(email, 'rate_limit_email', ip);
      return result;
    }

    // Rate limiting (per IP)
    if (ip) {
      const ipRateKey = `${RATE_LIMIT_PREFIX}ip:${ip}`;
      const ipCount = await kv.incr(ipRateKey);

      if (ipCount === 1) {
        await kv.expire(ipRateKey, RATE_LIMIT_WINDOW);
      }

      if (ipCount > RATE_LIMIT_MAX_PER_IP) {
        result.isSpam = true;
        result.reason = 'Zu viele Anfragen von dieser IP-Adresse';
        result.score = 100;
        result.details.rateLimited = true;
        await logSpamAttempt(email, 'rate_limit_ip', ip);
        return result;
      }
    }
  }

  // 6. Content analysis (scoring-based)
  const fullContent = `${subject} ${content}`.toLowerCase();

  // Check for spam keywords
  let keywordMatches = 0;
  for (const keyword of SPAM_KEYWORDS) {
    if (fullContent.includes(keyword.toLowerCase())) {
      keywordMatches++;
      result.score += 20;
    }
  }

  if (keywordMatches >= 2) {
    result.details.spamContent = true;
  }

  // Check for excessive links
  const linkCount = (content.match(/https?:\/\//gi) || []).length;
  if (linkCount > 5) {
    result.score += 30;
    result.details.tooManyLinks = true;
  } else if (linkCount > 3) {
    result.score += 15;
  }

  // Check for ALL CAPS (spam indicator)
  const capsRatio = (content.match(/[A-Z]/g) || []).length / Math.max(content.length, 1);
  if (capsRatio > 0.5 && content.length > 50) {
    result.score += 15;
  }

  // Check for repeated characters (e.g., "!!!!!!")
  if (/(.)\1{5,}/.test(content)) {
    result.score += 10;
  }

  // Final spam decision based on score
  if (result.score >= 50) {
    result.isSpam = true;
    result.reason = 'Nachricht als Spam erkannt';
    await logSpamAttempt(email, 'content_spam', ip);
  }

  return result;
}

/**
 * Check if email is in blocklist
 */
export async function isEmailInBlocklist(email: string): Promise<boolean> {
  const blocklist = await kv.smembers(BLOCKLIST_KEY);
  return blocklist.includes(email.toLowerCase());
}

/**
 * Check if domain is in blocklist
 */
export async function isDomainInBlocklist(domain: string): Promise<boolean> {
  const blocklist = await kv.smembers(DOMAIN_BLOCKLIST_KEY);
  return blocklist.includes(domain.toLowerCase());
}

/**
 * Add email to blocklist
 */
export async function addEmailToBlocklist(email: string): Promise<void> {
  await kv.sadd(BLOCKLIST_KEY, email.toLowerCase());
}

/**
 * Remove email from blocklist
 */
export async function removeEmailFromBlocklist(email: string): Promise<void> {
  await kv.srem(BLOCKLIST_KEY, email.toLowerCase());
}

/**
 * Add domain to blocklist
 */
export async function addDomainToBlocklist(domain: string): Promise<void> {
  await kv.sadd(DOMAIN_BLOCKLIST_KEY, domain.toLowerCase());
}

/**
 * Remove domain from blocklist
 */
export async function removeDomainFromBlocklist(domain: string): Promise<void> {
  await kv.srem(DOMAIN_BLOCKLIST_KEY, domain.toLowerCase());
}

/**
 * Get all blocked emails
 */
export async function getBlockedEmails(): Promise<string[]> {
  return await kv.smembers(BLOCKLIST_KEY);
}

/**
 * Get all blocked domains
 */
export async function getBlockedDomains(): Promise<string[]> {
  return await kv.smembers(DOMAIN_BLOCKLIST_KEY);
}

/**
 * Log spam attempt for analytics
 */
async function logSpamAttempt(email: string, reason: string, ip?: string): Promise<void> {
  const logKey = `${SPAM_LOG_PREFIX}${Date.now()}`;
  await kv.hset(logKey, {
    email,
    reason,
    ip: ip || 'unknown',
    timestamp: new Date().toISOString(),
  });
  // Expire log after 30 days
  await kv.expire(logKey, 30 * 24 * 60 * 60);

  // Increment spam counter
  await kv.incr('spam:stats:total');
  await kv.incr(`spam:stats:reason:${reason}`);
}

/**
 * Get spam statistics
 */
export async function getSpamStats(): Promise<{
  total: number;
  byReason: Record<string, number>;
  recentAttempts: Array<{
    email: string;
    reason: string;
    ip: string;
    timestamp: string;
  }>;
}> {
  const total = await kv.get<number>('spam:stats:total') || 0;

  // Get stats by reason
  const reasons = [
    'honeypot',
    'blocked_email',
    'blocked_domain',
    'disposable_email',
    'rate_limit_email',
    'rate_limit_ip',
    'content_spam',
  ];

  const byReason: Record<string, number> = {};
  for (const reason of reasons) {
    byReason[reason] = await kv.get<number>(`spam:stats:reason:${reason}`) || 0;
  }

  // Get recent attempts (last 50)
  const keys = await kv.keys(`${SPAM_LOG_PREFIX}*`);
  const sortedKeys = keys.sort().reverse().slice(0, 50);

  const recentAttempts: Array<{
    email: string;
    reason: string;
    ip: string;
    timestamp: string;
  }> = [];

  for (const key of sortedKeys) {
    const data = await kv.hgetall<{
      email: string;
      reason: string;
      ip: string;
      timestamp: string;
    }>(key);
    if (data) {
      recentAttempts.push(data);
    }
  }

  return { total, byReason, recentAttempts };
}

/**
 * Check if an email should be processed (for IMAP)
 * Less strict than web form - mainly checks blocklist
 */
export async function checkEmailForSpam(
  senderEmail: string,
  subject: string,
  content: string
): Promise<SpamCheckResult> {
  return checkForSpam({
    email: senderEmail,
    subject,
    content,
    skipRateLimit: true, // Don't rate limit incoming emails
  });
}

/**
 * Decrement rate limit counter when ticket is rejected for other reasons
 * This prevents false rate limiting when validation fails
 */
export async function decrementRateLimit(email: string, ip?: string): Promise<void> {
  const emailRateKey = `${RATE_LIMIT_PREFIX}email:${email.toLowerCase()}`;
  await kv.decr(emailRateKey);

  if (ip) {
    const ipRateKey = `${RATE_LIMIT_PREFIX}ip:${ip}`;
    await kv.decr(ipRateKey);
  }
}
