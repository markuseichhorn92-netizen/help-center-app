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
export const LOGO_URL = `${BASE_URL}/logo-white.svg`;

// Send ticket confirmation to customer
export async function sendTicketConfirmation(
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  subject: string
): Promise<boolean> {
  try {
    // Use IMAP_USER as reply-to so responses go to the right mailbox
    const replyToEmail = process.env.IMAP_USER || SUPPORT_EMAIL;

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
            .header-logo { margin-bottom: 15px; }
            .header-logo img { height: 40px; width: auto; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
            .header p { margin: 10px 0 0; opacity: 0.9; }
            .content { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .ticket-number { background: white; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #E8E8ED; }
            .ticket-number p { margin: 0 0 8px; color: #86868B; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
            .ticket-number span { font-size: 28px; font-weight: 700; color: #0a4958; font-family: monospace; }
            .footer { text-align: center; color: #86868B; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E8E8ED; }
            a { color: #0a4958; text-decoration: none; }
            a:hover { text-decoration: underline; }
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

              <p>Bitte bewahren Sie diese Nummer auf, um den Status Ihrer Anfrage zu verfolgen. Bei einer Antwort per E-Mail wird diese automatisch Ihrem Ticket zugeordnet.</p>

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
  conversationHistory?: TicketMessage[]
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
            .header-logo { margin-bottom: 15px; }
            .header-logo img { height: 40px; width: auto; }
            .ticket-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-family: monospace; font-weight: 600; }
            .header h2 { color: white; margin: 12px 0 0; font-size: 20px; font-weight: 600; }
            .content-wrapper { background: #FBFBFD; padding: 30px; border-radius: 0 0 12px 12px; border: 1px solid #E8E8ED; border-top: none; }
            .greeting { margin-bottom: 20px; }
            .reply-content { background: white; padding: 20px; border-radius: 12px; border: 1px solid #E8E8ED; margin: 20px 0; white-space: pre-wrap; }
            .conversation-history { margin-top: 30px; padding-top: 30px; border-top: 2px solid #E8E8ED; }
            .conversation-title { color: #0a4958; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px; }
            .message { margin-bottom: 20px; padding: 15px; border-radius: 12px; border: 1px solid #E8E8ED; }
            .message-customer { background: #F5F5F7; }
            .message-admin { background: #cfe5ea; border-color: #0a4958; }
            .message-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.1); }
            .message-sender { font-weight: 600; color: #0a4958; font-size: 14px; }
            .message-customer .message-sender { color: #1D1D1F; }
            .message-date { color: #86868B; font-size: 12px; }
            .message-content { color: #1D1D1F; white-space: pre-wrap; line-height: 1.6; }
            .footer { color: #86868B; font-size: 12px; border-top: 1px solid #E8E8ED; padding-top: 20px; margin-top: 30px; text-align: center; }
            a { color: #0a4958; text-decoration: none; }
            a:hover { text-decoration: underline; }
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
                ${String(replyContent || '').replace(/\n/g, '<br>')}
              </div>

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
                        <div class="message-content">${String(msg.content || '').replace(/\n/g, '<br>')}</div>
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
