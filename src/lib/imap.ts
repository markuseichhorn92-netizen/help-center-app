import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { createClient } from '@vercel/kv';
import { put } from '@vercel/blob';
import { createTicket, createMessage, findTicketByNumber, Attachment } from './tickets';
import { parseTicketNumberFromSubject, sendTicketConfirmation } from './resend';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
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
      const blob = await put(`attachments/${Date.now()}-${filename}`, att.content, {
        access: 'public',
        contentType: att.contentType || 'application/octet-stream',
      });

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
  });

  const results = { processed: 0, errors: [] as string[], debug };

  try {
    debug.push('Verbinde mit IMAP-Server...');
    await client.connect();
    debug.push('IMAP-Verbindung hergestellt');

    // Open INBOX
    debug.push('Öffne INBOX...');
    const lock = await client.getMailboxLock('INBOX');
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
      const messages = await client.search({
        since: startDate
      });

      const messageCount = messages ? (messages as number[]).length : 0;
      debug.push(`Gefunden: ${messageCount} ungelesene E-Mails`);
      console.log(`IMAP: Found ${messageCount} unseen messages since ${startDate.toISOString()}`);

      if (!messages || messages.length === 0) {
        return results;
      }

      for (const uid of messages as number[]) {
        try {
          // Check if this email was already processed
          const emailKey = `email:processed:${config.auth.user}:${uid}`;
          const alreadyProcessed = await kv.get(emailKey);
          if (alreadyProcessed) {
            continue;
          }

          // Fetch message
          const message = await client.fetchOne(uid, { source: true }) as { source?: Buffer } | false;

          if (!message || !message.source) {
            continue;
          }

          // Parse email
          const parsed: ParsedMail = await simpleParser(message.source);

          const fromAddress = Array.isArray(parsed.from?.value)
            ? parsed.from.value[0]
            : parsed.from?.value;
          const { name: senderName, email: senderEmail } = parseEmailAddress(fromAddress);

          // Skip if from our support email (avoid loops)
          const supportEmail = process.env.SUPPORT_EMAIL?.toLowerCase();
          if (supportEmail && senderEmail === supportEmail) {
            await client.messageFlagsAdd(uid, ['\\Seen']);
            continue;
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
            continue;
          }

          // Process attachments
          const attachments = await processAttachments(parsed);
          debug.push(`Anhänge gefunden: ${attachments.length}`);

          // Check if this is a reply to an existing ticket
          debug.push(`E-Mail Betreff: "${subject}"`);
          debug.push(`Absender: ${senderEmail}`);

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

              console.log(`Added reply to ticket ${ticketNumber} from ${senderEmail}`);
              results.processed++;

              // Mark as processed in KV
              const replyEmailKey = `email:processed:${config.auth.user}:${uid}`;
              await kv.set(replyEmailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });

              await client.messageFlagsAdd(uid, ['\\Seen']);
              continue;
            }
          }

          // Create new ticket
          const cleanSubject = subject
            .replace(/^(Re:|Fwd:|Fw:|Aw:|Antwort:)\s*/gi, '')
            .replace(/\[TKT-\d+\]\s*/gi, '')
            .trim() || 'Neue Anfrage per E-Mail';

          const { ticket } = await createTicket({
            subject: cleanSubject,
            customerName: senderName,
            customerEmail: senderEmail,
            content: content.trim(),
            priority: 'medium',
            attachments,
          });

          // Send confirmation (temporarily disabled)
          // await sendTicketConfirmation(
          //   senderEmail,
          //   senderName,
          //   ticket.ticketNumber,
          //   cleanSubject
          // );

          console.log(`Created ticket ${ticket.ticketNumber} from email by ${senderEmail}`);
          results.processed++;

          // Mark as processed in KV (expires after 30 days)
          await kv.set(emailKey, Date.now(), { ex: 30 * 24 * 60 * 60 });

          // Mark as read
          await client.messageFlagsAdd(uid, ['\\Seen']);

        } catch (msgError: any) {
          results.errors.push(`Fehler bei Nachricht ${uid}: ${msgError.message}`);
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
    debug.push(`Stack: ${error.stack}`);
    results.errors.push(`IMAP Fehler: ${error.message}`);
  }

  return results;
}
