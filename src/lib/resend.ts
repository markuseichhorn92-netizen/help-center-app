import { Resend } from 'resend';
import { TicketMessage } from './tickets';

// Lazy-initialize Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not configured!');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// Support email configuration
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de';
export const SUPPORT_NAME = 'FIT INN Support';
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://hilfe.fit-inn-trier.de';
// Use Sanity CDN hosted PNG for email compatibility (SVG not supported by most email clients)
export const LOGO_URL = 'https://cdn.sanity.io/images/6qiktmvm/production/e33b949b11d3aa8b60befb3f5f537803a8c48700-2917x486.png';

// Helper function to format content for email
// If content already contains HTML tags, use as-is; otherwise convert newlines to <br>
function formatEmailContent(content: string | undefined | null): string {
  const str = String(content || '');
  // Check if content contains HTML tags (e.g., <p>, <br>, <ul>, <li>, etc.)
  const hasHtmlTags = /<[a-z][\s\S]*>/i.test(str);
  if (hasHtmlTags) {
    return str;
  }
  // Plain text: convert newlines to <br>
  return str.replace(/\n/g, '<br>');
}

// Send ticket confirmation to customer
export async function sendTicketConfirmation(
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  subject: string,
  ticketId?: string,
  portalToken?: string
): Promise<boolean> {
  try {
    // Use IMAP_USER as reply-to so responses go to the right mailbox
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

    // Portal URL if token is provided
    const portalUrl = portalToken ? `${BASE_URL}/api/portal/auth/verify?token=${portalToken}` : null;

    await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      replyTo: replyToEmail,
      to: customerEmail,
      subject: `[${ticketNumber}] Ihre Anfrage: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; margin: 0; padding: 0; background-color: #FBFBFD; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header-logo { margin-bottom: 15px; background: white; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .header-logo img { height: 35px; width: auto; display: block; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .ticket-number { background: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #E8E8ED; }
            .ticket-number p { margin: 0 0 8px; color: #86868B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .ticket-number span { font-size: 28px; font-weight: 700; color: #0a4958; font-family: monospace; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white !important; padding: 14px 32px; border-radius: 25px; font-weight: 600; font-size: 15px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; color: #86868B; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8E8ED; }
            a { color: #0a4958; text-decoration: underline; word-break: break-word; }
            a:hover { color: #073440; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <img src="${LOGO_URL}" alt="FIT INN" height="40" style="height: 40px; width: auto;">
              </div>
              <h1>Hilfe-Center</h1>
              <p>Ihre Anfrage wurde empfangen</p>
            </div>
            <div class="content">
              <p>Hallo ${customerName},</p>
              <p>vielen Dank für Ihre Nachricht. Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <div class="ticket-number">
                <p>Ihre Ticket-Nummer</p>
                <span>${ticketNumber}</span>
              </div>

              <p><strong>Betreff:</strong> ${subject}</p>

              ${portalUrl ? `
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${portalUrl}" class="cta-button" style="color: white !important;">
                    Ticket im Portal ansehen
                  </a>
                </div>
                <p style="font-size: 14px; color: #86868B;">Im Kundenportal können Sie den Status verfolgen, Nachrichten hinzufügen und bei Online-Support live chatten.</p>
              ` : `
                <p>Bitte bewahren Sie diese Nummer auf, um den Status Ihrer Anfrage zu verfolgen.</p>
              `}

              <p>Bei einer Antwort per E-Mail wird diese automatisch Ihrem Ticket zugeordnet.</p>

              <p>Mit freundlichen Grüßen,<br>Ihr FIT INN Support Team</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie direkt auf diese E-Mail, um mit unserem Support zu kommunizieren.</p>
              <p style="margin-top: 10px;"><a href="https://fit-inn-trier.de">www.fit-inn-trier.de</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send ticket confirmation:', error);
    return false;
  }
}

interface EmailAttachment {
  filename: string;
  url: string;
}

// Send reply to customer
export async function sendTicketReply(
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  subject: string,
  replyContent: string,
  messageId?: string,
  attachments?: EmailAttachment[],
  conversationHistory?: TicketMessage[],
  portalToken?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY nicht konfiguriert' };
    }
    const headers: Record<string, string> = {};

    // Add threading headers if we have a previous message ID
    if (messageId) {
      headers['In-Reply-To'] = messageId;
      headers['References'] = messageId;
    }

    // Prepare attachments for Resend
    const emailAttachments = attachments?.map(att => ({
      filename: att.filename,
      path: att.url,
    })) || [];

    // Use IMAP_USER as reply-to so responses go to the right mailbox
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

    // Portal URL if token is provided
    const portalUrl = portalToken ? `${BASE_URL}/api/portal/auth/verify?token=${portalToken}` : null;

    const result = await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      replyTo: replyToEmail,
      to: customerEmail,
      subject: `Re: [${ticketNumber}] ${subject}`,
      headers,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; margin: 0; padding: 0; background-color: #FBFBFD; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white; padding: 25px 30px; border-radius: 12px 12px 0 0; }
            .header-logo { margin-bottom: 15px; background: white; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .header-logo img { height: 35px; width: auto; display: block; }
            .ticket-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-family: monospace; font-weight: 600; }
            .header h2 { color: white; margin: 12px 0 0; font-size: 20px; font-weight: 600; }
            .content-wrapper { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .greeting { margin-bottom: 20px; }
            .reply-content { background: white; padding: 20px; border-radius: 12px; border: 1px solid #E8E8ED; margin: 20px 0; line-height: 1.7; }
            .reply-content p { margin: 0 0 12px 0; }
            .reply-content p:last-child { margin-bottom: 0; }
            .reply-content a { color: #0a4958; text-decoration: underline; }
            .reply-content ul, .reply-content ol { padding-left: 20px; margin: 12px 0; }
            .reply-content li { margin: 4px 0; }
            .reply-content strong, .reply-content b { font-weight: 600; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white !important; padding: 14px 32px; border-radius: 25px; font-weight: 600; font-size: 15px; text-decoration: none; margin: 20px 0; }
            .conversation-history { margin-top: 30px; padding-top: 30px; border-top: 2px solid #E8E8ED; }
            .conversation-title { color: #0a4958; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
            .message { margin-bottom: 20px; padding: 15px; border-radius: 12px; border: 1px solid #E8E8ED; }
            .message-customer { background: #F5F5F7; }
            .message-admin { background: #cfe5ea; border-color: #0a4958; }
            .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); }
            .message-sender { font-weight: 600; color: #0a4958; font-size: 14px; }
            .message-customer .message-sender { color: #1D1D1F; }
            .message-date { color: #86868B; font-size: 12px; }
            .message-content { color: #1D1D1F; line-height: 1.6; }
            .message-content p { margin: 0 0 8px 0; }
            .message-content p:last-child { margin-bottom: 0; }
            .message-content a { color: #0a4958; text-decoration: underline; }
            .message-content ul, .message-content ol { padding-left: 18px; margin: 8px 0; }
            .message-content li { margin: 2px 0; }
            .footer { color: #86868B; font-size: 12px; border-top: 1px solid #E8E8ED; padding-top: 20px; margin-top: 30px; text-align: center; }
            a { color: #0a4958; text-decoration: underline; word-break: break-word; }
            a:hover { color: #073440; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <img src="${LOGO_URL}" alt="FIT INN" height="40" style="height: 40px; width: auto;">
              </div>
              <span class="ticket-badge">${ticketNumber}</span>
              <h2>${subject}</h2>
            </div>

            <div class="content-wrapper">
              <div class="greeting">
                <p>Hallo ${customerName},</p>
              </div>

              <div class="reply-content">
                ${formatEmailContent(replyContent)}
              </div>

              ${portalUrl ? `
                <div style="text-align: center; margin: 25px 0;">
                  <a href="${portalUrl}" class="cta-button" style="color: white !important;">
                    Im Portal antworten
                  </a>
                </div>
                <p style="font-size: 14px; color: #86868B; text-align: center;">Antworten Sie im Portal oder direkt auf diese E-Mail.</p>
              ` : ''}

              <p>Mit freundlichen Grüßen,<br>Ihr FIT INN Support Team</p>

              ${conversationHistory && conversationHistory.length > 0 ? `
                <div class="conversation-history">
                  <div class="conversation-title">Konversationsverlauf</div>
                  ${conversationHistory.map(msg => {
                    const isCustomer = msg.sender === 'customer';
                    const date = new Date(msg.createdAt).toLocaleString('de-DE', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    return `
                      <div class="message ${isCustomer ? 'message-customer' : 'message-admin'}">
                        <div class="message-header">
                          <span class="message-sender">${msg.senderName}</span>
                          <span class="message-date">${date}</span>
                        </div>
                        <div class="message-content">${formatEmailContent(msg.content)}</div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : ''}

              <div class="footer">
                <p>Antworten Sie direkt auf diese E-Mail, um die Konversation fortzusetzen.</p>
                <p style="margin-top: 10px;">FIT INN Trier | <a href="https://fit-inn-trier.de">www.fit-inn-trier.de</a></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error: any) {
    console.error('Failed to send ticket reply:', error);
    return { success: false, error: error.message || 'Unbekannter Fehler' };
  }
}

// Parse ticket number from email subject
export function parseTicketNumberFromSubject(subject: string): string | null {
  const match = subject.match(/\[?(TKT-\d+)\]?/i);
  return match ? match[1].toUpperCase() : null;
}

// Send portal magic link to customer
export async function sendPortalMagicLink(
  customerEmail: string,
  customerName: string,
  token: string,
  ticketNumber?: string
): Promise<boolean> {
  try {
    const portalUrl = `${BASE_URL}/api/portal/auth/verify?token=${token}`;
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

    await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      replyTo: replyToEmail,
      to: customerEmail,
      subject: ticketNumber
        ? `[${ticketNumber}] Ihr Zugangslink zum Kundenportal`
        : 'Ihr Zugangslink zum FIT INN Kundenportal',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; margin: 0; padding: 0; background-color: #FBFBFD; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header-logo { margin-bottom: 15px; background: white; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .header-logo img { height: 35px; width: auto; display: block; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white !important; padding: 16px 40px; border-radius: 25px; font-weight: 600; font-size: 16px; text-decoration: none; margin: 25px 0; }
            .cta-button:hover { background: linear-gradient(135deg, #073440 0%, #052530 100%); }
            .info-box { background: white; padding: 20px; border-radius: 12px; border: 1px solid #E8E8ED; margin: 20px 0; }
            .info-box p { margin: 0; color: #86868B; font-size: 14px; }
            ${ticketNumber ? `.ticket-badge { display: inline-block; background: #0a4958; color: white; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-family: monospace; font-weight: 600; margin-bottom: 15px; }` : ''}
            .footer { text-align: center; color: #86868B; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8E8ED; }
            a { color: #0a4958; text-decoration: underline; word-break: break-word; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <img src="${LOGO_URL}" alt="FIT INN" height="40" style="height: 40px; width: auto;">
              </div>
              <h1>Kundenportal</h1>
              <p>Ihr persönlicher Zugang</p>
            </div>
            <div class="content">
              <p>Hallo ${customerName},</p>

              ${ticketNumber ? `
                <p>Sie haben Zugang zu Ihrem Ticket angefordert:</p>
                <div style="text-align: center;">
                  <span class="ticket-badge">${ticketNumber}</span>
                </div>
              ` : `
                <p>Sie haben Zugang zum Kundenportal angefordert, um Ihre Tickets einzusehen.</p>
              `}

              <p>Klicken Sie auf den Button unten, um direkt zu Ihrem ${ticketNumber ? 'Ticket' : 'Portal'} zu gelangen:</p>

              <div style="text-align: center;">
                <a href="${portalUrl}" class="cta-button" style="color: white !important;">
                  ${ticketNumber ? 'Ticket ansehen' : 'Zum Kundenportal'}
                </a>
              </div>

              <div class="info-box">
                <p><strong>Hinweis:</strong> Dieser Link ist 7 Tage gültig. Im Portal können Sie:</p>
                <ul style="color: #86868B; font-size: 14px; margin: 10px 0 0; padding-left: 20px;">
                  <li>Den Status Ihrer Tickets einsehen</li>
                  <li>Nachrichten hinzufügen</li>
                  <li>Bei Online-Support live chatten</li>
                </ul>
              </div>

              <p style="font-size: 13px; color: #86868B;">Falls der Button nicht funktioniert, kopieren Sie diesen Link in Ihren Browser:<br>
              <a href="${portalUrl}" style="font-size: 12px; word-break: break-all;">${portalUrl}</a></p>

              <p>Mit freundlichen Grüßen,<br>Ihr FIT INN Support Team</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert, da Sie einen Portalzugang angefordert haben.</p>
              <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
              <p style="margin-top: 10px;"><a href="https://fit-inn-trier.de">www.fit-inn-trier.de</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send portal magic link:', error);
    return false;
  }
}

// Send session summary email when customer leaves the portal
export async function sendSessionSummaryEmail(
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  subject: string,
  sessionMessages: TicketMessage[]
): Promise<boolean> {
  try {
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

    await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      replyTo: replyToEmail,
      to: customerEmail,
      subject: `[${ticketNumber}] Zusammenfassung Ihrer Konversation`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; margin: 0; padding: 0; background-color: #FBFBFD; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white; padding: 25px 30px; border-radius: 12px 12px 0 0; }
            .header-logo { margin-bottom: 15px; background: white; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .header-logo img { height: 35px; width: auto; display: block; }
            .ticket-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-family: monospace; font-weight: 600; }
            .header h2 { color: white; margin: 12px 0 0; font-size: 20px; font-weight: 600; }
            .content { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .summary-title { color: #0a4958; font-size: 16px; font-weight: 600; margin-bottom: 15px; }
            .message { margin-bottom: 16px; padding: 15px; border-radius: 12px; border: 1px solid #E8E8ED; }
            .message-customer { background: #cfe5ea; border-color: #0a4958; }
            .message-admin { background: #F5F5F7; }
            .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(0,0,0,0.08); }
            .message-sender { font-weight: 600; color: #0a4958; font-size: 13px; }
            .message-customer .message-sender { color: #073440; }
            .message-date { color: #86868B; font-size: 11px; }
            .message-content { color: #1D1D1F; line-height: 1.6; font-size: 14px; }
            .cta-section { background: white; padding: 20px; border-radius: 12px; border: 1px solid #E8E8ED; margin: 25px 0; text-align: center; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white !important; padding: 14px 32px; border-radius: 25px; font-weight: 600; font-size: 15px; text-decoration: none; }
            .footer { text-align: center; color: #86868B; font-size: 12px; margin-top: 25px; padding-top: 20px; border-top: 1px solid #E8E8ED; }
            a { color: #0a4958; text-decoration: underline; word-break: break-word; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <img src="${LOGO_URL}" alt="FIT INN" height="40" style="height: 40px; width: auto;">
              </div>
              <span class="ticket-badge">${ticketNumber}</span>
              <h2>${subject}</h2>
            </div>

            <div class="content">
              <p>Hallo ${customerName},</p>

              <p>hier ist eine Zusammenfassung Ihrer letzten Konversation mit unserem Support-Team:</p>

              <div class="summary-title">Nachrichten (${sessionMessages.length})</div>

              ${sessionMessages.map(msg => {
                const isCustomer = msg.sender === 'customer';
                const date = new Date(msg.createdAt).toLocaleString('de-DE', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return `
                  <div class="message ${isCustomer ? 'message-customer' : 'message-admin'}">
                    <div class="message-header">
                      <span class="message-sender">${isCustomer ? customerName : 'FIT INN Support'}</span>
                      <span class="message-date">${date}</span>
                    </div>
                    <div class="message-content">${formatEmailContent(msg.content)}</div>
                  </div>
                `;
              }).join('')}

              <div class="cta-section">
                <p style="margin: 0 0 15px; color: #86868B; font-size: 14px;">
                  Möchten Sie die Konversation fortsetzen?
                </p>
                <a href="${BASE_URL}/portal" class="cta-button" style="color: white !important;">
                  Zum Kundenportal
                </a>
              </div>

              <p>Mit freundlichen Grüßen,<br>Ihr FIT INN Support Team</p>
            </div>

            <div class="footer">
              <p>Diese E-Mail enthält eine Zusammenfassung Ihrer Portal-Konversation.</p>
              <p>Antworten Sie direkt auf diese E-Mail, um die Konversation fortzusetzen.</p>
              <p style="margin-top: 10px;"><a href="https://fit-inn-trier.de">www.fit-inn-trier.de</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send session summary email:', error);
    return false;
  }
}

// Send notification to admin when new ticket is created
export async function sendNewTicketNotification(params: {
  ticketNumber: string;
  customerName: string;
  customerEmail: string;
  subject: string;
  channel: string;
  isEscalation?: boolean;
}): Promise<boolean> {
  const { ticketNumber, customerName, customerEmail, subject, channel, isEscalation } = params;

  // Admin email to notify
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || SUPPORT_EMAIL;

  try {
    const resend = getResend();

    const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : channel === 'web' ? 'Web-Chat' : 'E-Mail';
    const typeLabel = isEscalation ? '🚨 Eskaliert vom KI-Chat' : '📩 Neues Ticket';

    await resend.emails.send({
      from: `FIT INN System <${SUPPORT_EMAIL}>`,
      to: adminEmail,
      subject: `${typeLabel}: ${ticketNumber} - ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 500px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">

            <div style="background: linear-gradient(135deg, #0a4958 0%, #0d5a6b 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">
                ${isEscalation ? '🚨 Chat-Eskalation' : '📩 Neues Ticket'}
              </h1>
            </div>

            <div style="padding: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #86868B; font-size: 14px;">Ticket-Nr:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1d1d1f;">${ticketNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #86868B; font-size: 14px;">Kunde:</td>
                  <td style="padding: 8px 0; color: #1d1d1f;">${customerName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #86868B; font-size: 14px;">E-Mail:</td>
                  <td style="padding: 8px 0; color: #1d1d1f;">${customerEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #86868B; font-size: 14px;">Betreff:</td>
                  <td style="padding: 8px 0; color: #1d1d1f;">${subject}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #86868B; font-size: 14px;">Kanal:</td>
                  <td style="padding: 8px 0; color: #1d1d1f;">${channelLabel}</td>
                </tr>
              </table>

              ${isEscalation ? `
                <div style="margin-top: 16px; padding: 12px; background: #fef3c7; border-radius: 8px;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Hinweis:</strong> Der Kunde hat im KI-Chat um persönliche Hilfe gebeten.
                  </p>
                </div>
              ` : ''}

              <div style="margin-top: 24px; text-align: center;">
                <a href="${BASE_URL}/admin/tickets"
                   style="display: inline-block; padding: 12px 24px; background: #0a4958; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
                  Ticket öffnen
                </a>
              </div>
            </div>

            <div style="padding: 16px; background: #f5f5f7; text-align: center;">
              <p style="margin: 0; color: #86868B; font-size: 12px;">
                Diese Benachrichtigung wurde automatisch gesendet.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Admin notification sent for ticket ${ticketNumber}`);
    return true;
  } catch (error) {
    console.error('Failed to send admin notification:', error);
    return false;
  }
}

// Send forwarded message to external recipient
export async function sendForwardedMessage(params: {
  toEmail: string;
  toName?: string;
  forwardingNote?: string;
  originalMessage: {
    senderName: string;
    senderEmail: string;
    content: string;
    createdAt: string;
  };
  ticketInfo: {
    ticketNumber: string;
    subject: string;
  };
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { toEmail, toName, forwardingNote, originalMessage, ticketInfo } = params;
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

    const formattedDate = new Date(originalMessage.createdAt).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      replyTo: replyToEmail,
      to: toEmail,
      subject: `Fwd: [${ticketInfo.ticketNumber}] ${ticketInfo.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; margin: 0; padding: 0; background-color: #FBFBFD; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header-logo { margin-bottom: 15px; background: white; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .header-logo img { height: 35px; width: auto; display: block; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .content { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .note { background: #FEF3C7; padding: 16px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #F59E0B; }
            .note p { margin: 0; color: #92400E; }
            .forwarded { background: white; padding: 20px; border-radius: 12px; border: 1px solid #E8E8ED; margin-top: 20px; }
            .forwarded-header { color: #86868B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #E8E8ED; }
            .meta { color: #86868B; font-size: 13px; margin-bottom: 16px; }
            .message-content { color: #1D1D1F; }
            .footer { text-align: center; color: #86868B; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8E8ED; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <img src="${LOGO_URL}" alt="FIT INN" height="40" style="height: 40px; width: auto;">
              </div>
              <h1>Weitergeleitete Nachricht</h1>
            </div>
            <div class="content">
              ${toName ? `<p>Hallo ${toName},</p>` : ''}
              <p>die folgende Nachricht aus dem Support-Ticket <strong>${ticketInfo.ticketNumber}</strong> wurde an Sie weitergeleitet.</p>

              ${forwardingNote ? `
                <div class="note">
                  <p><strong>Anmerkung:</strong> ${forwardingNote}</p>
                </div>
              ` : ''}

              <div class="forwarded">
                <div class="forwarded-header">Weitergeleitete Nachricht</div>
                <div class="meta">
                  <strong>Von:</strong> ${originalMessage.senderName} (${originalMessage.senderEmail})<br>
                  <strong>Datum:</strong> ${formattedDate}<br>
                  <strong>Betreff:</strong> ${ticketInfo.subject}
                </div>
                <div class="message-content">
                  ${formatEmailContent(originalMessage.content)}
                </div>
              </div>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde über das FIT INN Hilfe-Center weitergeleitet.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Forwarded message from ticket ${ticketInfo.ticketNumber} to ${toEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send forwarded message:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unbekannter Fehler' };
  }
}

// Send rating request email to customer
export async function sendRatingRequestEmail(params: {
  customerEmail: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  ratingToken: string;
}): Promise<boolean> {
  try {
    const { customerEmail, customerName, ticketNumber, subject, ratingToken } = params;
    const ratingUrl = `${BASE_URL}/feedback/${ticketNumber}/${ratingToken}`;
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

    await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      replyTo: replyToEmail,
      to: customerEmail,
      subject: `Wie war unser Support? [${ticketNumber}]`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1D1D1F; margin: 0; padding: 0; background-color: #FBFBFD; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header-logo { margin-bottom: 15px; background: white; display: inline-block; padding: 10px 20px; border-radius: 8px; }
            .header-logo img { height: 35px; width: auto; display: block; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; text-align: center; }
            .stars { font-size: 40px; margin: 30px 0; letter-spacing: 8px; }
            .ticket-info { background: white; padding: 16px; border-radius: 12px; margin: 20px 0; border: 1px solid #E8E8ED; text-align: left; }
            .ticket-info p { margin: 4px 0; color: #86868B; font-size: 14px; }
            .ticket-info strong { color: #1D1D1F; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #0a4958 0%, #073440 100%); color: white !important; padding: 16px 40px; border-radius: 25px; font-weight: 600; font-size: 16px; text-decoration: none; margin: 25px 0; }
            .footer { text-align: center; color: #86868B; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8E8ED; }
            a { color: #0a4958; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="header-logo">
                <img src="${LOGO_URL}" alt="FIT INN" height="40" style="height: 40px; width: auto;">
              </div>
              <h1>Wie war unser Support?</h1>
              <p>Ihr Ticket wurde geschlossen</p>
            </div>
            <div class="content">
              <p>Hallo ${customerName},</p>
              <p>Ihr Support-Ticket wurde erfolgreich bearbeitet und geschlossen. Wir würden uns sehr über Ihr Feedback freuen!</p>

              <div class="stars">⭐⭐⭐⭐⭐</div>

              <p>Wie zufrieden waren Sie mit unserem Service?</p>

              <a href="${ratingUrl}" class="cta-button">Jetzt bewerten</a>

              <div class="ticket-info">
                <p><strong>Ticket:</strong> ${ticketNumber}</p>
                <p><strong>Betreff:</strong> ${subject}</p>
              </div>

              <p style="color: #86868B; font-size: 13px;">
                Der Bewertungslink ist 7 Tage gültig.
              </p>
            </div>
            <div class="footer">
              <p>Vielen Dank, dass Sie sich für FIT INN entschieden haben!</p>
              <p style="margin-top: 10px;">
                <a href="${BASE_URL}">FIT INN Hilfe-Center</a>
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`Rating request sent to ${customerEmail} for ticket ${ticketNumber}`);
    return true;
  } catch (error) {
    console.error('Failed to send rating request email:', error);
    return false;
  }
}
