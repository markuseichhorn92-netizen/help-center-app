import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import { createTicket, createMessage, findTicketByNumber } from './tickets';
import { parseTicketNumberFromSubject, sendTicketConfirmation } from './resend';

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

      debug.push(`Suche nach ungelesenen E-Mails seit ${startDate.toISOString()}...`);

      // Search for unseen messages since start date
      const messages = await client.search({
        seen: false,
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
          const htmlContent = typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]*>/g, '') : '';
          const content = parsed.text || htmlContent || '';
          const messageId = parsed.messageId || undefined;

          if (!content.trim()) {
            await client.messageFlagsAdd(uid, ['\\Seen']);
            continue;
          }

          // Check if this is a reply to an existing ticket
          const ticketNumber = parseTicketNumberFromSubject(subject);

          if (ticketNumber) {
            const existingTicket = await findTicketByNumber(ticketNumber);

            if (existingTicket) {
              // Add message to existing ticket
              await createMessage({
                ticketId: existingTicket.id,
                content: content.trim(),
                sender: 'customer',
                senderName,
                senderEmail,
                emailMessageId: messageId,
              });

              console.log(`Added reply to ticket ${ticketNumber} from ${senderEmail}`);
              results.processed++;
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
          });

          // Send confirmation
          await sendTicketConfirmation(
            senderEmail,
            senderName,
            ticket.ticketNumber,
            cleanSubject
          );

          console.log(`Created ticket ${ticket.ticketNumber} from email by ${senderEmail}`);
          results.processed++;

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
