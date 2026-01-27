import { NextRequest, NextResponse } from "next/server";
import { verifyPortalSession, incrementSessionMessages, isAdminOnline } from "@/lib/portal";
import { getTicket, getTicketMessages, createMessage, updateTicket } from "@/lib/tickets";
import { generateAutoReply, wantsHuman, markHumanRequested, isAutoReplyEnabled } from "@/lib/ai-autoreply";

// GET - Retrieve messages for a ticket
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session cookie
    const sessionId = req.cookies.get("portal_session")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Verify session
    const session = await verifyPortalSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session abgelaufen" },
        { status: 401 }
      );
    }

    // Get ticket
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket nicht gefunden" },
        { status: 404 }
      );
    }

    // Verify the session email matches the ticket customer email
    if (ticket.customerEmail.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Get messages
    const messages = await getTicketMessages(id);

    // Sanitize messages for customer view (remove internal data)
    const sanitizedMessages = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender,
      senderName: msg.sender === "customer" ? ticket.customerName : "FIT INN Support",
      createdAt: msg.createdAt,
      attachments: msg.attachments,
    }));

    return NextResponse.json({ messages: sanitizedMessages });
  } catch (error) {
    console.error("Portal messages fetch error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}

// POST - Add a new message to a ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get session cookie
    const sessionId = req.cookies.get("portal_session")?.value;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Nicht authentifiziert" },
        { status: 401 }
      );
    }

    // Verify session
    const session = await verifyPortalSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: "Session abgelaufen" },
        { status: 401 }
      );
    }

    // Get ticket
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json(
        { error: "Ticket nicht gefunden" },
        { status: 404 }
      );
    }

    // Verify the session email matches the ticket customer email
    if (ticket.customerEmail.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Zugriff verweigert" },
        { status: 403 }
      );
    }

    // Check if ticket is closed
    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "Dieses Ticket ist geschlossen. Bitte erstellen Sie ein neues Ticket." },
        { status: 400 }
      );
    }

    // Get message content
    const { content } = await req.json();

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Nachricht darf nicht leer sein" },
        { status: 400 }
      );
    }

    // Limit message length
    if (content.length > 10000) {
      return NextResponse.json(
        { error: "Nachricht ist zu lang (max. 10.000 Zeichen)" },
        { status: 400 }
      );
    }

    // Check if customer wants to talk to a human
    const customerWantsHuman = wantsHuman(content.trim());
    if (customerWantsHuman) {
      await markHumanRequested(id);
    }

    // Create customer message
    const message = await createMessage({
      ticketId: id,
      content: content.trim(),
      sender: "customer",
      senderName: ticket.customerName,
      senderEmail: ticket.customerEmail,
      channel: "web",
    });

    // If ticket was resolved, reopen it
    if (ticket.status === "resolved") {
      await updateTicket(id, { status: "open" });
    }

    // Track session activity
    await incrementSessionMessages(session.email, id);

    // Check if we should generate an AI auto-reply
    const adminOnline = await isAdminOnline();
    const autoReplyEnabled = await isAutoReplyEnabled(id);

    let aiResponse = null;

    if (!adminOnline && autoReplyEnabled && !customerWantsHuman) {
      // Admin is offline and auto-reply is enabled - generate AI response
      console.log("Admin offline, generating AI auto-reply");

      const messages = await getTicketMessages(id);
      const aiResult = await generateAutoReply({
        customerMessage: content.trim(),
        customerName: ticket.customerName,
        ticketSubject: ticket.subject,
        conversationHistory: messages,
        isWhatsApp: false,
      });

      if (aiResult.success) {
        // Create AI response message
        const aiMessage = await createMessage({
          ticketId: id,
          content: aiResult.content,
          sender: "admin",
          senderName: "FIT INN Assistent",
          senderEmail: process.env.SUPPORT_EMAIL || "support@fit-inn-trier.de",
          channel: "web",
          deliveryChannel: "live",
        });

        aiResponse = {
          id: aiMessage.id,
          content: aiMessage.content,
          sender: aiMessage.sender,
          senderName: "FIT INN Assistent",
          createdAt: aiMessage.createdAt,
          isAiGenerated: true,
        };
      }
    } else if (customerWantsHuman) {
      // Customer wants human - send confirmation
      const humanConfirmMessage = await createMessage({
        ticketId: id,
        content: "Ich habe einen Mitarbeiter benachrichtigt. Jemand aus unserem Team wird sich in Kurze bei dir melden. Vielen Dank fur deine Geduld!",
        sender: "admin",
        senderName: "FIT INN Assistent",
        senderEmail: process.env.SUPPORT_EMAIL || "support@fit-inn-trier.de",
        channel: "web",
        deliveryChannel: "live",
      });

      aiResponse = {
        id: humanConfirmMessage.id,
        content: humanConfirmMessage.content,
        sender: humanConfirmMessage.sender,
        senderName: "FIT INN Assistent",
        createdAt: humanConfirmMessage.createdAt,
        isAiGenerated: true,
      };
    }

    return NextResponse.json({
      message: {
        id: message.id,
        content: message.content,
        sender: message.sender,
        senderName: ticket.customerName,
        createdAt: message.createdAt,
      },
      aiResponse,
      humanRequested: customerWantsHuman,
    });
  } catch (error) {
    console.error("Portal message create error:", error);
    return NextResponse.json(
      { error: "Ein Fehler ist aufgetreten" },
      { status: 500 }
    );
  }
}
