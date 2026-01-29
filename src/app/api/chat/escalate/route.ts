import { NextRequest, NextResponse } from "next/server";
import { getChatSession, updateChatSession } from "@/lib/ai-chat";
import { createTicket, createMessage } from "@/lib/tickets";
import { sendNewTicketNotification } from "@/lib/resend";
import { checkForSpam } from "@/lib/spam-protection";

// POST: Escalate chat to a ticket
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, email, name } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "email is required for escalation" },
        { status: 400 }
      );
    }

    // Get IP address for rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
               req.headers.get('x-real-ip') ||
               'unknown';

    // Spam check
    const spamCheck = await checkForSpam({
      email,
      ip,
    });

    if (spamCheck.isSpam) {
      return NextResponse.json(
        { error: spamCheck.reason || 'Anfrage wurde als Spam erkannt.' },
        { status: 429 }
      );
    }

    // Get session
    const session = await getChatSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if already escalated
    if (session.escalated && session.ticketId) {
      return NextResponse.json({
        success: true,
        ticketId: session.ticketId,
        message: "Ticket wurde bereits erstellt.",
      });
    }

    // Build chat history as HTML for the ticket
    const chatHistoryHtml = session.messages
      .map((msg) => {
        const sender = msg.role === "user" ? (name || "Kunde") : "KI-Assistent";
        const time = new Date(msg.timestamp).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<p><strong>${sender}</strong> (${time}):<br/>${msg.content.replace(/\n/g, "<br/>")}</p>`;
      })
      .join("\n");

    // Create ticket
    const { ticket } = await createTicket({
      customerName: name || email.split("@")[0],
      customerEmail: email,
      subject: "Chat-Anfrage: Mitarbeiter gewünscht",
      content: "Kunde hat im KI-Chat um persönliche Hilfe gebeten.",
      channel: "web",
      priority: "high", // Escalated tickets are high priority
    });

    // Create initial message with chat history
    await createMessage({
      ticketId: ticket.id,
      content: `<div style="background: #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
        <p style="margin: 0; font-weight: 600; color: #92400e;">📋 Chat-Verlauf vor Eskalation:</p>
      </div>
      ${chatHistoryHtml}
      <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p><em>Der Kunde hat um persönliche Hilfe gebeten.</em></p>`,
      sender: "customer",
      senderName: name || email.split("@")[0],
      senderEmail: email,
      channel: "web",
    });

    // Mark session as escalated
    await updateChatSession(sessionId, {
      escalated: true,
      ticketId: ticket.id,
      email,
    });

    // Send notification to admin
    try {
      await sendNewTicketNotification({
        ticketNumber: ticket.ticketNumber,
        customerName: name || email.split("@")[0],
        customerEmail: email,
        subject: "Chat-Anfrage: Mitarbeiter gewünscht",
        channel: "web",
        isEscalation: true,
      });
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      message: `Ticket ${ticket.ticketNumber} wurde erstellt. Ein Mitarbeiter wird sich bei dir melden.`,
    });
  } catch (error: any) {
    console.error("Escalation error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}
