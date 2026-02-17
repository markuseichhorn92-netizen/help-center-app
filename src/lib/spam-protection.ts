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
  // Classic spam
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

// Marketing/Newsletter indicators - higher threshold needed
const MARKETING_KEYWORDS = [
  'newsletter',
  'unsubscribe',
  'abmelden',
  'abbestellen',
  'email preferences',
  'e-mail-einstellungen',
  'view in browser',
  'im browser ansehen',
  'no longer wish to receive',
  'nicht mehr erhalten',
  'ihre vorteile',
  'exklusives angebot',
  'jetzt sichern',
  'nur noch heute',
  'zeitlich begrenzt',
  'sonderangebot',
  'rabatt sichern',
  'gutschein',
  'promo code',
  'black friday',
  'cyber monday',
  'kostenlose lieferung',
  'gratis versand',
  'jetzt bestellen',
  'jetzt kaufen',
  'jetzt shoppen',
  'sale %',
  '% rabatt',
  'bis zu 50%',
  'bis zu 70%',
  'super sale',
  'flash sale',
  'limited edition',
  'neu im sortiment',
  'neue kollektion',
  'bestseller',
  'top angebot',
  'email campaign',
  'marketing',
  'promotional',
  'special offer',
  'exclusive deal',
  'early access',
  'vip zugang',
  'member exclusive',
  'treue-bonus',
  'treuepunkte',
  'kundenkarte',
  'payback',
  'deutschlandcard',
];

// Domains that are typically mass-mailers / marketing
const MARKETING_SENDER_DOMAINS = [
  'mail.mailchimp.com',
  'mailchimp.com',
  'sendgrid.net',
  'sendgrid.com',
  'mailgun.org',
  'mailgun.com',
  'sendinblue.com',
  'brevo.com',
  'klaviyo.com',
  'hubspot.com',
  'hubspotmail.com',
  'mailjet.com',
  'constantcontact.com',
  'aweber.com',
  'getresponse.com',
  'activecampaign.com',
  'drip.com',
  'convertkit.com',
  'flodesk.com',
  'omnisend.com',
  'emarsys.com',
  'salesforce.com',
  'exacttarget.com',
  'responsys.com',
  'cheetahmail.com',
  'experian.com',
  'returnpath.com',
  'e.newsletter',
  'newsletter.',
  'news.',
  'marketing.',
  'promo.',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'bounce',
  'mailer-daemon',
  // German bulk senders
  'inxmail.com',
  'cleverreach.com',
  'newsletter2go.com',
  'rapidmail.de',
  'evalanche.com',
  'artegic.com',
  'optivo.com',
  'ecircle.com',
  'xqueue.com',
  // Common commercial senders
  'amazon.de',
  'amazon.com',
  'ebay.de',
  'ebay.com',
  'paypal.de',
  'paypal.com',
  'linkedin.com',
  'facebookmail.com',
  'youtube.com',
  'google.com',
  'apple.com',
  'microsoft.com',
  'spotify.com',
  'netflix.com',
  'zalando.de',
  'aboutyou.de',
  'otto.de',
  'mediamarkt.de',
  'saturn.de',
  'lidl.de',
  'aldi.de',
  'rewe.de',
  'edeka.de',
  'dm.de',
  'rossmann.de',
  'ikea.com',
  'booking.com',
  'airbnb.com',
  'expedia.de',
  'check24.de',
  'verivox.de',
  'idealo.de',
  'guenstiger.de',
  'billiger.de',
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
 * Aggressive filtering for marketing/newsletter emails
 * Only allows through: customer inquiries, invoices, important requests
 */
export async function checkEmailForSpam(
  senderEmail: string,
  subject: string,
  content: string
): Promise<SpamCheckResult> {
  const emailLower = senderEmail.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const contentLower = content.toLowerCase();
  const fullText = `${subjectLower} ${contentLower}`;

  // 1. First run basic spam check
  const basicCheck = await checkForSpam({
    email: senderEmail,
    subject,
    content,
    skipRateLimit: true,
  });

  if (basicCheck.isSpam) {
    return basicCheck;
  }

  // 2. Check if sender domain is a known mass-mailer
  const senderDomain = emailLower.split('@')[1] || '';
  for (const marketingDomain of MARKETING_SENDER_DOMAINS) {
    if (senderDomain.includes(marketingDomain) || emailLower.includes(marketingDomain)) {
      return {
        isSpam: true,
        reason: `Marketing-Absender: ${senderDomain}`,
        score: 100,
        details: {
          rateLimited: false,
          blockedEmail: false,
          blockedDomain: true,
          disposableEmail: false,
          spamContent: false,
          tooManyLinks: false,
          honeypotTriggered: false,
        },
      };
    }
  }

  // 3. Check for noreply/newsletter sender patterns
  if (
    emailLower.includes('noreply') ||
    emailLower.includes('no-reply') ||
    emailLower.includes('donotreply') ||
    emailLower.includes('newsletter') ||
    emailLower.includes('marketing') ||
    emailLower.includes('promo') ||
    emailLower.includes('news@') ||
    emailLower.includes('info@') && MARKETING_SENDER_DOMAINS.some(d => senderDomain.includes(d))
  ) {
    return {
      isSpam: true,
      reason: `Automatischer Absender: ${emailLower}`,
      score: 100,
      details: {
        rateLimited: false,
        blockedEmail: true,
        blockedDomain: false,
        disposableEmail: false,
        spamContent: false,
        tooManyLinks: false,
        honeypotTriggered: false,
      },
    };
  }

  // 4. Count marketing keywords
  let marketingScore = 0;
  let marketingKeywordsFound: string[] = [];
  
  for (const keyword of MARKETING_KEYWORDS) {
    if (fullText.includes(keyword.toLowerCase())) {
      marketingScore += 15;
      marketingKeywordsFound.push(keyword);
    }
  }

  // 5. Check for WHITELIST patterns (things that should ALWAYS pass)
  const isLikelyCustomerInquiry = 
    // Direct questions
    fullText.includes('frage') ||
    fullText.includes('fragen') ||
    fullText.includes('können sie') ||
    fullText.includes('könnten sie') ||
    fullText.includes('würden sie') ||
    fullText.includes('bitte um') ||
    fullText.includes('ich möchte') ||
    fullText.includes('ich würde gerne') ||
    fullText.includes('ich hätte gerne') ||
    fullText.includes('interesse an') ||
    fullText.includes('wie funktioniert') ||
    fullText.includes('was kostet') ||
    fullText.includes('wann ist') ||
    fullText.includes('wo finde ich') ||
    fullText.includes('können wir') ||
    fullText.includes('termin') ||
    fullText.includes('anmeldung') ||
    fullText.includes('mitgliedschaft') ||
    fullText.includes('probetraining') ||
    fullText.includes('kündigung') ||
    fullText.includes('vertrag') ||
    fullText.includes('beschwerde') ||
    fullText.includes('reklamation') ||
    fullText.includes('problem mit') ||
    fullText.includes('hilfe bei') ||
    fullText.includes('unterstützung') ||
    // Invoices & important documents
    fullText.includes('rechnung') ||
    fullText.includes('invoice') ||
    fullText.includes('zahlung') ||
    fullText.includes('überweisung') ||
    fullText.includes('mahnung') ||
    fullText.includes('quittung') ||
    fullText.includes('beleg') ||
    fullText.includes('bestätigung ihrer') ||
    // Personal greetings (indicates real person)
    fullText.includes('sehr geehrte') ||
    fullText.includes('sehr geehrter') ||
    fullText.includes('liebe frau') ||
    fullText.includes('lieber herr') ||
    fullText.includes('hallo fit-inn') ||
    fullText.includes('guten tag');

  // If it looks like a customer inquiry, let it through
  if (isLikelyCustomerInquiry) {
    return {
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
  }

  // 6. Block if too many marketing keywords
  if (marketingScore >= 45) {
    return {
      isSpam: true,
      reason: `Marketing/Newsletter erkannt: ${marketingKeywordsFound.slice(0, 3).join(', ')}`,
      score: marketingScore,
      details: {
        rateLimited: false,
        blockedEmail: false,
        blockedDomain: false,
        disposableEmail: false,
        spamContent: true,
        tooManyLinks: false,
        honeypotTriggered: false,
      },
    };
  }

  // 7. Check for excessive HTML (newsletters are usually heavily formatted)
  const htmlTagCount = (content.match(/<[^>]+>/g) || []).length;
  const textLength = content.replace(/<[^>]+>/g, '').length;
  const htmlRatio = htmlTagCount / Math.max(textLength / 100, 1);
  
  if (htmlRatio > 5 && marketingScore >= 15) {
    return {
      isSpam: true,
      reason: 'Newsletter-Format erkannt (viel HTML, wenig Text)',
      score: 80,
      details: {
        rateLimited: false,
        blockedEmail: false,
        blockedDomain: false,
        disposableEmail: false,
        spamContent: true,
        tooManyLinks: false,
        honeypotTriggered: false,
      },
    };
  }

  // 8. Check for tracking pixels (1x1 images, common in newsletters)
  if (content.includes('width="1"') || content.includes('height="1"') || content.includes('1x1')) {
    marketingScore += 20;
  }

  // Final check
  if (marketingScore >= 30) {
    return {
      isSpam: true,
      reason: 'Wahrscheinlich Marketing/Newsletter',
      score: marketingScore,
      details: {
        rateLimited: false,
        blockedEmail: false,
        blockedDomain: false,
        disposableEmail: false,
        spamContent: true,
        tooManyLinks: false,
        honeypotTriggered: false,
      },
    };
  }

  return basicCheck;
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
