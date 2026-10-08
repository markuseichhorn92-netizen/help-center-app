import { createHash } from 'crypto';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { kv } from './kv';
import { put } from '@vercel/blob';
import { createTicket, createMessage, findTicketByNumber, updateTicket, Attachment, createSpamTicket, findMessageByExternalId } from './tickets';
import { parseTicketNumberFromSubject, sendTicketConfirmation, sendNewTicketNotification } from './resend';
import { ensureContactFromTicket, updateLastContact } from './contacts';
import { generatePortalToken } from './portal';
import { notifyNewMessage, notifyNewTicket } from './push-notifications';
import { createDocument } from './documents';
import { checkEmailForSpam } from './spam-protection';

interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Time budget per cron run (Vercel maxDuration is 300 s)
const RUN_BUDGET_MS = 240_000;
const PER_MESSAGE_TIMEOUT_MS = 90_000;
const OP_TIMEOUT_MS = 45_000;
const MAX_MESSAGE_BYTES = 25 * 1024 * 1024;
const MAX_FAILURES_PER_MESSAGE = 3;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout nach ${Math.round(ms / 1000)}s: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Log-safe identifier: never log subject, sender or Message-ID in clear text
function hashId(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 10);
}

// Make a problematic mail visible in the admin ticket list instead of blocking every run
async function reportSkippedMessage(info: { uid: number; size?: number; reason: string; hash: string }): Promise<void> {
  try {
    await kv.lpush('email:skipped', JSON.stringify({ ...info, at: new Date().toISOString() }));
    await kv.ltrim('email:skipped', 0, 99);
    await createTicket({
      subject: 'E-Mail-Import fehlgeschlagen – bitte im Postfach prüfen',
      customerName: 'System',
      customerEmail: process.env.SUPPORT_EMAIL?.toLowerCase() || 'system@fit-inn-trier.de',
      content: `Eine E-Mail konnte nicht automatisch importiert werden und wurde übersprungen (UID ${info.uid}, Kennung ${info.hash}${info.size ? `, ${Math.round(info.size / 1024)} KB` : ''}). Grund: ${info.reason}. Die Mail liegt ungelesen im Postfach.`,
      priority: 'high',
      channel: 'email',
    });
  } catch (e) {
    console.error('[IMAP] Could not report skipped message', info.hash);
  }
}

function getIMAPConfig(): IMAPConfig {
  return {
    host: process.env.IMAP_HOST || '',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_SECURE !== 'false',
    auth: {
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '',
    },
  };
}

// Process email attachments and upload to Vercel Blob
async function processAttachments(parsed: ParsedMail): Promise<Attachment[]> {
  const attachments: Attachment[] = [];

  if (!parsed.attachments || parsed.attachments.length === 0) {
    return attachments;
  }

  for (const att of parsed.attachments) {
    try {
      // Skip inline images and very large files (> 10MB)
      if (att.contentDisposition === 'inline' || att.size > 10 * 1024 * 1024) {
        continue;
      }

      const filename = att.filename || `attachment-${Date.now()}`;
      const blob = await withTimeout(put(`attachments/${Date.now()}-${filename}`, att.content, {
        access: 'public',
        contentType: att.contentType || 'application/octet-stream',
      }), OP_TIMEOUT_MS, 'Anhang-Upload');

      attachments.push({
        id: crypto.randomUUID(),
        filename: filename,
        url: blob.url,
        size: att.size,
        contentType: att.contentType || 'application/octet-stream',
      });
    } catch (error) {
      console.error('Failed to upload attachment:', error);
    }
  }

  return attachments;
}

// Create document entries for attachments (for OCR processing)
async function createDocumentsFromAttachments(attachments: Attachment[], ticketId: string, uploaderEmail: string): Promise<void> {
  for (const att of attachments) {
    try {
      await createDocument({
        filename: att.filename,
        url: att.url,
        size: att.size,
        contentType: att.contentType,
        ticketId,
        uploadedBy: uploaderEmail,
        tags: ['email-anhang'],
      });
    } catch (error) {
      console.error('Failed to create document entry:', error);
    }
  }
}

// Extract name and email from address
function parseEmailAddress(address: { name?: string; address?: string } | string | undefined): { name: string; email: string } {
  if (!address) {
    return { name: 'Unbekannt', email: 'unknown@example.com' };
  }

  if (typeof address === 'string') {
    const match = address.match(/^(?:(.+?)\s*<)?([^<>]+)>?$/);
    if (match) {
      return {
        name: match[1]?.trim() || match[2].split('@')[0],
        email: match[2].trim().toLowerCase(),
      };
    }
    return { name: address, email: address };
  }

  return {
    name: address.name || address.address?.split('@')[0] || 'Unbekannt',
    email: address.address?.toLowerCase() || 'unknown@example.com',
  };
}

export async function fetchAndProcessEmails(): Promise<{ processed: number; errors: string[]; debug: string[] }> {
  const config = getIMAPConfig();
  const debug: string[] = [];

  debug.push(`IMAP Config: host=${config.host}, port=${config.port}, secure=${config.secure}, user=${config.auth.user ? '***' : 'MISSING'}, pass=${config.auth.pass ? '***' : 'MISSING'}`);

  if (!config.host || !config.auth.user || !config.auth.pass) {
    debug.push('IMAP nicht konfiguriert - fehlende Umgebungsvariablen');
    return { processed: 0, errors: ['IMAP nicht konfiguriert'], debug };
  }

  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    logger: false,
    connectionTimeout: 30_000,
    greetingTimeout: 15_000,
    socketTimeout: 60_000,
  });
  client.on('error', (err: Error) => {
    console.error('[IMAP] client error:', err.message);
  });
  const runStart = Date.now();
  const deadline = runStart + RUN_BUDGET_MS;

  const results = { processed: 0, errors: [] as string[], debug };

  try {
    debug.push('Verbinde mit IMAP-Server...');
    await withTimeout(client.connect(), 40_000, 'IMAP connect');
    debug.push('IMAP-Verbindung hergestellt');

    // Open INBOX
    debug.push('Öffne INBOX...');
    const lock = await withTimeout(client.getMailboxLock('INBOX'), OP_TIMEOUT_MS, 'IMAP INBOX');
    debug.push('INBOX geöffnet');

    try {
      // Only fetch emails from start date onwards (prevents processing old emails)
      // Default: Start of yesterday (midnight) - process emails from last 24h+
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const startDate = process.env.IMAP_START_DATE
        ? new Date(process.env.IMAP_START_DATE)
        : yesterday;

      debug.push(`Suche nach E-Mails seit ${startDate.toISOString()}...`);

      // Search for all messages since start date (not just unseen)
      const messages = await withTimeout(client.search({
        since: startDate
      }), OP_TIMEOUT_MS, 'IMAP search');

      const messageCount = messages ? (messages as number[]).length : 0;
      debug.push(`Gefunden: ${messageCount} ungelesene E-Mails`);
      console.log(`IMAP: Found ${messageCount} messages since ${startDate.toISOString()}`);

      if (!messages || messages.length === 0) {
        return results;
      }

      // Check all processed-markers in one round trip
      const uids = messages as number[];
      const processedFlags = await kv.mget<(number | null)[]>(
        ...uids.map((u) => `email:processed:${config.auth.user}:${u}`)
      );
      const pending = uids.filter((_, i) => !processedFlags[i]);
      debug.push(`Noch zu verarbeiten: ${pending.length} von ${uids.length}`);

      for (const uid of pending) {
        if (Date.now() > deadline - 15_000) {
          debug.push('Zeitbudget erreicht – Rest im nächsten Lauf');
          console.log(`IMAP: time budget reached, ${pending.length - results.processed} left for next run`);
          break;
        }
        const failKey = `email:fail:${config.auth.user}:${uid}`;
        const emailKey = `email:processed:${config.auth.user}:${uid}`;
        try {
          await withTimeout((async () => {
          const messageSize = await withTimeout(
            client.fetchOne(uid, { size: true }) as Promise<{ size?: number } | false>,
            OP_TIMEOUT_MS,
            'IMAP size'
          );
          const size = messageSize && messageSize.size ? messageSize.size : 0;
          if (size > MAX_MESSAGE_BYTES) {
            const hash = hashId(`${config.auth.user}:${uid}`);
            console.warn(`[IMAP] skip too large message hash=${hash} size=${size}`);
            await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });
            await reportSkippedMessage({ uid, size, hash, reason: 'E-Mail zu groß (> 25 MB)' });
            return;
          }

          // Fetch message
          const message = await withTimeout(client.fetchOne(uid, { source: true }) as Promise<{ source?: Buffer } | false>, OP_TIMEOUT_MS, 'IMAP fetch');

          if (!message || !message.source) {
            return;
          }

          // Parse email
          const parsed: ParsedMail = await withTimeout(simpleParser(message.source), OP_TIMEOUT_MS, 'Mail parsen');

          const fromAddress = Array.isArray(parsed.from?.value)
            ? parsed.from.value[0]
            : parsed.from?.value;
          const { name: senderName, email: senderEmail } = parseEmailAddress(fromAddress);

          // Skip if from our support email (avoid loops)
          const supportEmail = process.env.SUPPORT_EMAIL?.toLowerCase();
          if (supportEmail && senderEmail === supportEmail) {
            await client.messageFlagsAdd(uid, ['\\Seen']);
            return;
          }

          // Check if sender is on spam blacklist
          const { isSpamEmail } = await import('./spam');
          if (await isSpamEmail(senderEmail)) {
            debug.push(`⛔ Spam-Absender übersprungen (hash=${hashId(senderEmail)})`);
            await client.messageFlagsAdd(uid, ['\\Seen']);
            return;
          }

          const subject = parsed.subject || 'Kein Betreff';
          const messageId = parsed.messageId || undefined;

          // Prefer HTML content for proper formatting, fallback to text
          let content = '';
          if (typeof parsed.html === 'string' && parsed.html.trim()) {
            // Use HTML content but sanitize dangerous elements
            content = parsed.html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
              .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
              .replace(/on\w+='[^']*'/gi, ''); // Remove event handlers (single quotes)
          } else if (parsed.text) {
            // Convert plain text to simple HTML
            content = parsed.text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br>');
          }

          if (!content.trim()) {
            await client.messageFlagsAdd(uid, ['\\Seen']);
            return;
          }

          // Process attachments
          const attachments = await processAttachments(parsed);
          debug.push(`Anhänge gefunden: ${attachments.length}`);

          // Check if this is a reply to an existing ticket

          const ticketNumber = parseTicketNumberFromSubject(subject);
          debug.push(`Erkannte Ticket-Nummer: ${ticketNumber || 'KEINE'}`);

          if (ticketNumber) {
            const existingTicket = await findTicketByNumber(ticketNumber);
            debug.push(`Ticket gefunden: ${existingTicket ? 'JA' : 'NEIN'}`);

            if (existingTicket) {
              // Add message to existing ticket
              await createMessage({
                ticketId: existingTicket.id,
                content: content.trim(),
                sender: 'customer',
                senderName,
                senderEmail,
                emailMessageId: messageId,
                attachments,
              });

              // Reopen ticket if it was closed or resolved (customer replied)
              if (existingTicket.status === 'closed' || existingTicket.status === 'resolved') {
                await updateTicket(existingTicket.id, { status: 'open' });
                console.log(`Reopened ticket ${ticketNumber} due to customer reply`);
                debug.push(`Ticket ${ticketNumber} wurde wieder geöffnet (Kundenantwort)`);
              }

              // Mark as processed right away (idempotent even if later steps time out)
              await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });
              await updateLastContact(senderEmail);

              // Create document entries for attachments (for OCR processing)
              if (attachments.length > 0) {
                await createDocumentsFromAttachments(attachments, existingTicket.id, senderEmail);
              }

              // Send push notification for new message
              try {
                await notifyNewMessage({
                  ticketId: existingTicket.id,
                  ticketNumber: existingTicket.ticketNumber,
                  customerName: senderName,
                  preview: content.substring(0, 100).replace(/<[^>]*>/g, ''),
                });
              } catch (e) {
                console.error('[Push] New message notification failed:', e);
              }

              console.log(`Added reply to ticket ${ticketNumber}`);
              results.processed++;

              await client.messageFlagsAdd(uid, ['\\Seen']);
              return;
            }
          }

          // Create new ticket
          const cleanSubject = subject
            .replace(/^(Re:|Fwd:|Fw:|Aw:|Antwort:)\s*/gi, '')
            .replace(/\[TKT-\d+\]\s*/gi, '')
            .trim() || 'Neue Anfrage per E-Mail';

          // Check if this email was already imported (duplicate check by Message-ID)
          if (messageId) {
            const existingMessage = await findMessageByExternalId(messageId, 'email', { deadline: Date.now() + 30_000 });
            if (existingMessage) {
              debug.push(`Duplikat erkannt (hash=${hashId(messageId)})`);
              console.log(`Skipping duplicate email (hash=${hashId(messageId)})`);
              // Mark as processed to avoid reprocessing
              await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });
              await client.messageFlagsAdd(uid, ['\\Seen']);
              return;
            }
          }

          // Check for spam before creating ticket
          const spamCheck = await checkEmailForSpam(senderEmail, cleanSubject, content);
          if (spamCheck.isSpam) {
            debug.push(`SPAM erkannt (hash=${hashId(senderEmail)}): ${spamCheck.reason}`);
            console.log(`Blocked spam email (hash=${hashId(senderEmail)}): ${spamCheck.reason}`);

            // Store as spam ticket for admin review
            await createSpamTicket({
              subject: cleanSubject,
              customerName: senderName,
              customerEmail: senderEmail,
              content: content.trim(),
              priority: 'low',
              attachments,
              channel: 'email',
              spamReason: spamCheck.reason || 'Spam erkannt',
            });

            // Mark as processed to avoid reprocessing
            await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });
            await client.messageFlagsAdd(uid, ['\\Seen']);
            results.processed++;
            return;
          }

          const { ticket } = await createTicket({
            subject: cleanSubject,
            customerName: senderName,
            customerEmail: senderEmail,
            content: content.trim(),
            priority: 'medium',
            attachments,
            channel: 'email',  // Important: This disables AI auto-reply for emails
            emailMessageId: messageId,  // Store for duplicate detection
          });

          // Mark as processed right away (idempotent even if later steps time out)
          await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });

          // Ensure contact exists
          await ensureContactFromTicket({
            name: senderName,
            email: senderEmail,
          });

          // Create document entries for attachments (for OCR processing)
          if (attachments.length > 0) {
            await createDocumentsFromAttachments(attachments, ticket.id, senderEmail);
          }

          // Generate portal token for direct access
          const portalToken = await generatePortalToken(senderEmail, ticket.id);

          // Send confirmation email with portal link (DISABLED per request 2026-02-03)
          // To re-enable: set SEND_TICKET_CONFIRMATION=true in .env
          if (process.env.SEND_TICKET_CONFIRMATION === 'true') {
            await sendTicketConfirmation(
              senderEmail,
              senderName,
              ticket.ticketNumber,
              cleanSubject,
              ticket.id,
              portalToken.token
            );
          }

          // Notify admin about new email ticket
          try {
            await sendNewTicketNotification({
              ticketNumber: ticket.ticketNumber,
              customerName: senderName,
              customerEmail: senderEmail,
              subject: cleanSubject,
              channel: 'email',
              isEscalation: false,
            });
          } catch (notifyError) {
            console.error('Failed to send admin notification:', notifyError);
          }

          // Send push notification for new ticket
          try {
            await notifyNewTicket({
              ticketId: ticket.id,
              ticketNumber: ticket.ticketNumber,
              customerName: senderName,
              subject: cleanSubject,
            });
          } catch (e) {
            console.error('[Push] New ticket notification failed:', e);
          }

          console.log(`Created ticket ${ticket.ticketNumber} from email`);
          results.processed++;

          // Mark as read
          await client.messageFlagsAdd(uid, ['\\Seen']);

          })(), PER_MESSAGE_TIMEOUT_MS, 'Nachricht verarbeiten');
        } catch (msgError: any) {
          const hash = hashId(`${config.auth.user}:${uid}`);
          const failures = await kv.incr(failKey).catch(() => 1);
          await kv.expire(failKey, 7 * 24 * 60 * 60).catch(() => undefined);
          console.error(`[IMAP] message hash=${hash} failed (${failures}/${MAX_FAILURES_PER_MESSAGE}): ${msgError.message}`);
          results.errors.push(`Fehler bei Nachricht ${hash}: ${msgError.message}`);
          if (failures >= MAX_FAILURES_PER_MESSAGE) {
            await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });
            await reportSkippedMessage({ uid, hash, reason: `${MAX_FAILURES_PER_MESSAGE}x fehlgeschlagen: ${msgError.message}` });
          }
        }
      }
    } finally {
      lock.release();
    }

    debug.push('Logout vom IMAP-Server...');
    await client.logout();
    debug.push('IMAP-Verbindung geschlossen');
  } catch (error: any) {
    debug.push(`IMAP Fehler: ${error.message}`);
        results.errors.push(`IMAP Fehler: ${error.message}`);
  }

  return results;
}
