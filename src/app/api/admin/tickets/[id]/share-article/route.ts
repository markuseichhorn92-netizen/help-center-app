import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getTicket, createMessage, getTicketMessages } from "@/lib/tickets";
import { sendTicketReply } from "@/lib/resend";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { generatePortalToken, getCustomerPresence } from "@/lib/portal";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  published: boolean;
}

// Generate beautiful Apple-style article card HTML for chat/email
function generateArticleCardHTML(article: Article, baseUrl: string): string {
  const articleUrl = `${baseUrl}/artikel/${article.slug}`;

  // Extract first 150 characters of content as preview (strip HTML)
  const previewText = article.content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 150) + "...";

  return `
<div style="margin: 16px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <a href="${articleUrl}" target="_blank" style="text-decoration: none; color: inherit; display: block;">
    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
      <!-- Header with icon -->
      <div style="background: linear-gradient(135deg, #0a4958 0%, #0d5a6b 100%); padding: 20px; display: flex; align-items: center; gap: 12px;">
        <div style="width: 40px; height: 40px; background: rgba(255,255,255,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14,2 14,8 20,8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10,9 9,9 8,9"></polyline>
          </svg>
        </div>
        <div>
          <div style="color: rgba(255,255,255,0.7); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px;">Hilfe-Artikel</div>
          <div style="color: white; font-size: 12px; font-weight: 500;">${article.category || "Allgemein"}</div>
        </div>
      </div>

      <!-- Content -->
      <div style="padding: 20px;">
        <h3 style="margin: 0 0 8px 0; font-size: 17px; font-weight: 600; color: #1e293b; line-height: 1.3;">${article.title}</h3>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #64748b; line-height: 1.5;">${previewText}</p>

        <!-- CTA Button -->
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #0a4958; color: white; padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 500;">
          <span>Artikel lesen</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12,5 19,12 12,19"></polyline>
          </svg>
        </div>
      </div>
    </div>
  </a>
</div>`;
}

// Generate WhatsApp-friendly text message
function generateWhatsAppMessage(article: Article, baseUrl: string): string {
  const articleUrl = `${baseUrl}/artikel/${article.slug}`;
  const previewText = article.content
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100) + "...";

  return `📚 *${article.title}*

${previewText}

👉 ${articleUrl}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { articleId, channel } = await req.json();

    if (!articleId) {
      return NextResponse.json({ error: "articleId is required" }, { status: 400 });
    }

    const ticket = await getTicket(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
    }

    // Get the article
    const articleData = await kv.hgetall(`article:${articleId}`);
    console.log("Article data for ID", articleId, ":", articleData);

    if (!articleData) {
      return NextResponse.json({ error: "Artikel nicht gefunden" }, { status: 404 });
    }

    // Check published status (could be boolean or string "true")
    const isPublished = articleData.published === true || articleData.published === "true";
    if (!isPublished) {
      return NextResponse.json({ error: "Artikel ist nicht veröffentlicht" }, { status: 404 });
    }

    const article: Article = {
      id: articleId,
      title: articleData.title as string || "",
      slug: articleData.slug as string || "",
      content: articleData.content as string || "",
      category: articleData.category as string || "Allgemein",
      published: true,
    };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hilfe.fit-inn-trier.de";
    const ticketChannel = (ticket as any).channel || "email";
    const isWhatsApp = ticketChannel === "whatsapp";

    // Determine actual channel to use
    let deliveryChannel: "live" | "email" | "whatsapp";
    const requestedChannel = channel || "auto";

    if (requestedChannel === "auto") {
      if (isWhatsApp) {
        deliveryChannel = "whatsapp";
      } else {
        const customerPresence = await getCustomerPresence(ticket.customerEmail);
        deliveryChannel = customerPresence.online ? "live" : "email";
      }
    } else {
      deliveryChannel = requestedChannel as "live" | "email" | "whatsapp";
    }

    let messageContent: string;
    let sendResult: { success: boolean; error?: string; messageId?: string; messageSid?: string } = { success: false };

    if (deliveryChannel === "whatsapp" && ticket.phone) {
      // Send via WhatsApp
      messageContent = generateWhatsAppMessage(article, baseUrl);

      const whatsappResult = await sendWhatsAppMessage({
        to: ticket.phone,
        message: messageContent,
        ticketNumber: ticket.ticketNumber,
      });

      sendResult = {
        success: whatsappResult.success,
        error: whatsappResult.error,
        messageSid: whatsappResult.messageSid,
      };

      // Save message
      await createMessage({
        ticketId: id,
        content: messageContent,
        sender: "admin",
        senderName: "Support Team",
        senderEmail: process.env.SUPPORT_EMAIL || "support@fit-inn-trier.de",
        channel: "whatsapp",
        whatsappMessageId: whatsappResult.messageSid,
        deliveryChannel: "whatsapp",
      });

    } else if (deliveryChannel === "email") {
      // Send via Email with beautiful HTML card
      const articleCardHtml = generateArticleCardHTML(article, baseUrl);
      messageContent = `Ich habe einen Hilfe-Artikel gefunden, der für Sie hilfreich sein könnte:\n\n${articleCardHtml}`;

      const messages = await getTicketMessages(id);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
      const portalToken = await generatePortalToken(ticket.customerEmail, id);

      const emailResult = await sendTicketReply(
        ticket.customerEmail,
        ticket.customerName,
        ticket.ticketNumber,
        ticket.subject,
        messageContent,
        lastMessage?.emailMessageId,
        undefined,
        messages,
        portalToken.token
      );

      sendResult = {
        success: emailResult.success,
        error: emailResult.error,
        messageId: emailResult.messageId,
      };

      // Save message
      await createMessage({
        ticketId: id,
        content: messageContent,
        sender: "admin",
        senderName: "Support Team",
        senderEmail: process.env.SUPPORT_EMAIL || "support@fit-inn-trier.de",
        channel: "email",
        emailMessageId: emailResult.messageId,
        deliveryChannel: "email",
      });

    } else {
      // Live chat - just save the message with nice HTML card
      const articleCardHtml = generateArticleCardHTML(article, baseUrl);
      messageContent = articleCardHtml;

      const message = await createMessage({
        ticketId: id,
        content: messageContent,
        sender: "admin",
        senderName: "Support Team",
        senderEmail: process.env.SUPPORT_EMAIL || "support@fit-inn-trier.de",
        channel: "web",
        deliveryChannel: "live",
      });

      sendResult = { success: true };
    }

    return NextResponse.json({
      success: sendResult.success,
      error: sendResult.error,
      deliveryChannel,
      articleTitle: article.title,
    });

  } catch (error: any) {
    console.error("Error sharing article:", error);
    return NextResponse.json({
      error: "Fehler beim Teilen des Artikels",
      details: error.message,
    }, { status: 500 });
  }
}
