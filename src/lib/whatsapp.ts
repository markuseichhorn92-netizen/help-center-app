interface Attachment {
  filename: string;
  url: string;
  contentType?: string;
  size?: number;
}

interface SendWhatsAppRequest {
  to: string;
  message: string;
  ticketNumber?: string;
  messageId?: string;
  attachments?: Attachment[];
}

export async function sendWhatsAppMessage(
  data: SendWhatsAppRequest
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const { to, message, ticketNumber, messageId, attachments } = data;

    if (!to || !message) {
      return { success: false, error: "Missing 'to' or 'message'" };
    }

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.error('Missing Twilio credentials');
      return { success: false, error: 'Twilio not configured' };
    }

    // Format phone number for WhatsApp
    let formattedTo = to;
    if (!to.startsWith('whatsapp:')) {
      formattedTo = `whatsapp:${to}`;
    }

    // Format WhatsApp number
    let formattedFrom = TWILIO_WHATSAPP_NUMBER;
    if (!formattedFrom.startsWith('whatsapp:')) {
      formattedFrom = `whatsapp:${formattedFrom}`;
    }

    // Build message with ticket number if provided
    let fullMessage = message;
    if (ticketNumber) {
      fullMessage = `[${ticketNumber}]\n\n${message}\n\n---\nFit-Inn Trier Hilfe-Center`;
    }

    console.log(`Sending WhatsApp from ${formattedFrom} to ${formattedTo}`);
    console.log(`Attachments: ${attachments?.length || 0}`);

    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Status callback URL for delivery/read receipts
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://hilfe.fit-inn-trier.de';
    const statusCallbackUrl = `${baseUrl}/api/webhooks/whatsapp-status`;

    let lastMessageSid = '';

    // If there are attachments, send each as a separate media message
    if (attachments && attachments.length > 0) {
      // Send text message first
      const textFormData = new URLSearchParams();
      textFormData.append('From', formattedFrom);
      textFormData.append('To', formattedTo);
      textFormData.append('Body', fullMessage);
      textFormData.append('StatusCallback', statusCallbackUrl);

      const textResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: textFormData,
      });

      const textResponseData = await textResponse.json();
      console.log('Twilio text response:', JSON.stringify(textResponseData));

      if (!textResponse.ok) {
        console.error('Twilio text error:', textResponseData);
        return {
          success: false,
          error: textResponseData.message || 'WhatsApp could not be sent',
        };
      }

      lastMessageSid = textResponseData.sid;

      // Send each attachment as a media message
      for (const attachment of attachments) {
        console.log(`Sending attachment: ${attachment.filename} (${attachment.url})`);

        const mediaFormData = new URLSearchParams();
        mediaFormData.append('From', formattedFrom);
        mediaFormData.append('To', formattedTo);
        mediaFormData.append('MediaUrl', attachment.url);
        mediaFormData.append('Body', `📎 ${attachment.filename}`);
        mediaFormData.append('StatusCallback', statusCallbackUrl);

        const mediaResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: mediaFormData,
        });

        const mediaResponseData = await mediaResponse.json();
        console.log('Twilio media response:', JSON.stringify(mediaResponseData));

        if (!mediaResponse.ok) {
          console.error('Twilio media error:', mediaResponseData);
          // Continue with other attachments even if one fails
        } else {
          lastMessageSid = mediaResponseData.sid;
        }
      }
    } else {
      // No attachments, send regular text message
      const formData = new URLSearchParams();
      formData.append('From', formattedFrom);
      formData.append('To', formattedTo);
      formData.append('Body', fullMessage);
      formData.append('StatusCallback', statusCallbackUrl);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const responseData = await response.json();
      console.log('Twilio response:', JSON.stringify(responseData));

      if (!response.ok) {
        console.error('Twilio error:', responseData);
        return {
          success: false,
          error: responseData.message || 'WhatsApp could not be sent',
        };
      }

      lastMessageSid = responseData.sid;
    }

    return { success: true, messageSid: lastMessageSid };
  } catch (error: unknown) {
    console.error('Error sending WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}
