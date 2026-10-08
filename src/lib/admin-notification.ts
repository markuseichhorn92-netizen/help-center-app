// Inhalt der Admin-Benachrichtigung bei neuen Anfragen (HTML + Text + Reply-To).
// Reine Funktionen ohne Seiteneffekte, damit sie ohne Resend/KV testbar sind.

export interface AdminNotificationAttachment {
  filename: string;
  size: number;
}

export interface AdminNotificationInput {
  ticketId?: string;
  ticketNumber: string;
  category?: 'kundenanfrage' | 'sonstiges';
  customerName: string;
  customerEmail: string;
  phone?: string;
  subject: string;
  content?: string;
  channel: 'email' | 'whatsapp' | 'web' | 'chat' | 'form' | string;
  createdAt?: string;
  attachments?: AdminNotificationAttachment[];
  isEscalation?: boolean;
  baseUrl: string;
}

export interface AdminNotification {
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED_ENTITIES[e] ?? m;
  });
}

/** Nachricht (Klartext oder HTML aus dem Mail-Import) als Klartext mit Zeilenumbrüchen. */
export function messageToPlainText(content: string | undefined | null): string {
  const str = String(content || '');
  if (!/<[a-z!/][\s\S]*>/i.test(str)) return str.replace(/\r\n?/g, '\n').trim();
  return decodeEntities(
    str
      .replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '• ')
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function formatBerlin(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  const date = Number.isNaN(d.getTime()) ? new Date() : d;
  return (
    new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(date) + ' Uhr'
  );
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'E-Mail',
  whatsapp: 'WhatsApp',
  web: 'Formular',
  form: 'Formular',
  chat: 'Chat',
};

const MAX_MESSAGE_CHARS = 20000;

function validReplyTo(email: string): string | undefined {
  const e = (email || '').trim();
  // WhatsApp-Kontakte haben nur eine Pseudo-Adresse (<nummer>@whatsapp)
  if (!/^[^\s@<>,;]+@[^\s@<>,;]+\.[a-z]{2,}$/i.test(e) || /@whatsapp$/i.test(e)) return undefined;
  return e;
}

export function buildAdminNotification(input: AdminNotificationInput): AdminNotification {
  const channelLabel = input.isEscalation
    ? 'Chat (KI-Eskalation)'
    : CHANNEL_LABELS[input.channel] || input.channel;
  const categoryLabel = input.category === 'sonstiges' ? 'Sonstiges' : 'Kundenanfrage';
  const replyTo = validReplyTo(input.customerEmail);
  const when = formatBerlin(input.createdAt);
  const link = input.ticketId
    ? `${input.baseUrl}/admin/tickets/${encodeURIComponent(input.ticketId)}`
    : `${input.baseUrl}/admin/tickets`;

  let message = messageToPlainText(input.content);
  if (message.length > MAX_MESSAGE_CHARS) message = message.slice(0, MAX_MESSAGE_CHARS) + '\n[… gekürzt, vollständig im Ticket]';

  const attachments = (input.attachments || []).filter((a) => a && a.filename);
  const contact = replyTo ? input.customerEmail : `${input.customerEmail} (kein Reply-To möglich)`;

  const rows: Array<[string, string]> = [
    ['Ticket-Nr.', input.ticketNumber],
    ['Kategorie', categoryLabel],
    ['Name', input.customerName],
    ['E-Mail', contact],
  ];
  if (input.phone) rows.push(['Telefon', input.phone]);
  rows.push(['Betreff', input.subject], ['Kanal', channelLabel], ['Eingegangen', when]);

  const prefix = input.isEscalation ? '🚨 Eskalation' : '📩 Neue Anfrage';
  const subject = `${prefix} [${input.ticketNumber}] ${input.subject}`.replace(/[\r\n]+/g, ' ');

  const rowHtml = rows
    .map(([k, v]) => `
                <tr>
                  <td style="padding:6px 12px 6px 0;color:#86868B;font-size:13px;vertical-align:top;white-space:nowrap;">${escapeHtml(k)}</td>
                  <td style="padding:6px 0;color:#14252D;font-size:15px;vertical-align:top;word-break:break-word;${k === 'Ticket-Nr.' ? 'font-weight:600;' : ''}">${
                    k === 'E-Mail' && replyTo
                      ? `<a href="mailto:${escapeHtml(replyTo)}" style="color:#0a4958;">${escapeHtml(v)}</a>`
                      : escapeHtml(v)
                  }</td>
                </tr>`)
    .join('');

  const attachmentHtml = attachments.length
    ? `
              <p style="margin:20px 0 6px;color:#86868B;font-size:13px;">Anhänge (${attachments.length}) – im Ticket abrufbar</p>
              <ul style="margin:0;padding-left:20px;color:#14252D;font-size:14px;line-height:1.6;">${attachments
                .map((a) => `<li>${escapeHtml(a.filename)}${a.size ? ` (${escapeHtml(formatFileSize(a.size))})` : ''}</li>`)
                .join('')}</ul>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#0A4958;padding:20px 24px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">${escapeHtml(prefix)} · ${escapeHtml(input.ticketNumber)}</h1>
    </div>
    <div style="padding:24px;">
      <table role="presentation" style="width:100%;border-collapse:collapse;">${rowHtml}
      </table>

      <p style="margin:20px 0 6px;color:#86868B;font-size:13px;">Nachricht</p>
      <div style="padding:14px 16px;background:#f5f5f7;border-left:4px solid #FFB54F;border-radius:6px;color:#14252D;font-size:15px;line-height:1.55;white-space:pre-wrap;word-break:break-word;">${escapeHtml(message) || '<em>(kein Text)</em>'}</div>${attachmentHtml}

      <div style="margin-top:28px;text-align:center;">
        <a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 28px;background:#0A4958;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Ticket im Admin öffnen</a>
      </div>
      <p style="margin:20px 0 0;color:#86868B;font-size:12px;text-align:center;">${
        replyTo ? 'Mit „Antworten“ schreibst du direkt an den Kunden.' : 'Dieser Kontakt hat keine E-Mail-Adresse – bitte im Ticket antworten.'
      }</p>
    </div>
  </div>
</body>
</html>`;

  const text = [
    `${prefix} [${input.ticketNumber}]`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Nachricht:',
    message || '(kein Text)',
    ...(attachments.length
      ? ['', `Anhänge (${attachments.length}):`, ...attachments.map((a) => `- ${a.filename}${a.size ? ` (${formatFileSize(a.size)})` : ''}`)]
      : []),
    '',
    `Ticket öffnen: ${link}`,
    replyTo ? 'Mit „Antworten“ schreibst du direkt an den Kunden.' : '',
  ].join('\n').trimEnd();

  return { subject, html, text, replyTo };
}
