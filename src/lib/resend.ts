import { Resend } from 'resend';

// Lazy-initialize Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Support email configuration
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@fit-inn-trier.de';
export const SUPPORT_NAME = 'FIT INN Support';

// Send ticket confirmation to customer
export async function sendTicketConfirmation(
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  subject: string
): Promise<boolean> {
  try {
    await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      to: customerEmail,
      subject: `[${ticketNumber}] Ihre Anfrage: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .ticket-number { background: white; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
            .ticket-number span { font-size: 24px; font-weight: bold; color: #e11d48; font-family: monospace; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">FIT INN Hilfe-Center</h1>
              <p style="margin:10px 0 0;">Ihre Anfrage wurde empfangen</p>
            </div>
            <div class="content">
              <p>Hallo ${customerName},</p>
              <p>vielen Dank für Ihre Nachricht. Wir haben Ihre Anfrage erhalten und werden uns schnellstmöglich bei Ihnen melden.</p>

              <div class="ticket-number">
                <p style="margin:0 0 5px; color:#666;">Ihre Ticket-Nummer:</p>
                <span>${ticketNumber}</span>
              </div>

              <p><strong>Betreff:</strong> ${subject}</p>

              <p>Bitte bewahren Sie diese Nummer auf, um den Status Ihrer Anfrage zu verfolgen. Bei einer Antwort per E-Mail wird diese automatisch Ihrem Ticket zugeordnet.</p>

              <p>Mit freundlichen Grüßen,<br>Ihr FIT INN Support Team</p>
            </div>
            <div class="footer">
              <p>Diese E-Mail wurde automatisch generiert. Bitte antworten Sie direkt auf diese E-Mail, um mit unserem Support zu kommunizieren.</p>
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

// Send reply to customer
export async function sendTicketReply(
  customerEmail: string,
  customerName: string,
  ticketNumber: string,
  subject: string,
  replyContent: string,
  messageId?: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const headers: Record<string, string> = {};

    // Add threading headers if we have a previous message ID
    if (messageId) {
      headers['In-Reply-To'] = messageId;
      headers['References'] = messageId;
    }

    const result = await getResend().emails.send({
      from: `${SUPPORT_NAME} <${SUPPORT_EMAIL}>`,
      to: customerEmail,
      subject: `Re: [${ticketNumber}] ${subject}`,
      headers,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { border-bottom: 2px solid #e11d48; padding-bottom: 15px; margin-bottom: 20px; }
            .header h2 { color: #e11d48; margin: 0; }
            .ticket-badge { display: inline-block; background: #fee2e2; color: #be123c; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-family: monospace; }
            .content { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { color: #666; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <span class="ticket-badge">${ticketNumber}</span>
              <h2 style="margin-top:10px;">${subject}</h2>
            </div>

            <p>Hallo ${customerName},</p>

            <div class="content">
              ${replyContent.replace(/\n/g, '<br>')}
            </div>

            <p>Mit freundlichen Grüßen,<br>Ihr FIT INN Support Team</p>

            <div class="footer">
              <p>Antworten Sie direkt auf diese E-Mail, um die Konversation fortzusetzen.</p>
              <p>FIT INN Trier | <a href="https://fit-inn-trier.de" style="color:#e11d48;">www.fit-inn-trier.de</a></p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('Failed to send ticket reply:', error);
    return { success: false };
  }
}

// Parse ticket number from email subject
export function parseTicketNumberFromSubject(subject: string): string | null {
  const match = subject.match(/\[?(TKT-\d+)\]?/i);
  return match ? match[1].toUpperCase() : null;
}
