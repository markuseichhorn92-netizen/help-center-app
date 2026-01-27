import { NextRequest, NextResponse } from "next/server";
import {
  createChatSession,
  getChatSession,
  addMessageToSession,
  generateChatResponse,
  getWelcomeMessage,
  wantsHumanSupport,
} from "@/lib/ai-chat";

// POST: Send a message or start a new session
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, message, email, action } = body;

    // Action: Start new session
    if (action === "start") {
      console.log("Starting new chat session...");
      const session = await createChatSession(email);
      console.log("Session created:", session.sessionId);

      const welcomeMessage = getWelcomeMessage();

      // Add welcome message to session
      await addMessageToSession(session.sessionId, {
        role: "assistant",
        content: welcomeMessage,
        timestamp: new Date().toISOString(),
      });
      console.log("Welcome message added to session");

      return NextResponse.json({
        sessionId: session.sessionId,
        message: welcomeMessage,
        escalated: false,
      });
    }

    // Action: Send message
    if (!sessionId || !message) {
      return NextResponse.json(
        { error: "sessionId and message are required" },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await getChatSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Check if already escalated
    if (session.escalated) {
      return NextResponse.json({
        message: "Dein Ticket wurde bereits erstellt. Ein Mitarbeiter wird sich bei dir melden.",
        escalated: true,
        ticketId: session.ticketId,
      });
    }

    // Update email if provided
    if (email && !session.email) {
      session.email = email;
    }

    // Add user message to session
    await addMessageToSession(sessionId, {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Check if user wants human support
    const wantsHuman = wantsHumanSupport(message);

    if (wantsHuman) {
      // Return signal that escalation is needed
      return NextResponse.json({
        message: "Ich verstehe, du möchtest mit einem Mitarbeiter sprechen. Gib bitte deine E-Mail-Adresse an, damit wir uns bei dir melden können.",
        needsEmail: !session.email,
        wantsHuman: true,
        escalated: false,
      });
    }

    // Generate AI response
    const aiResponse = await generateChatResponse({
      sessionId,
      userMessage: message,
    });

    // Add AI response to session
    await addMessageToSession(sessionId, {
      role: "assistant",
      content: aiResponse.content,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      message: aiResponse.content,
      escalated: false,
      wantsHuman: aiResponse.wantsHuman,
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error details:", errorMessage, errorStack);
    return NextResponse.json(
      { error: errorMessage || "Unbekannter Fehler", details: errorStack },
      { status: 500 }
    );
  }
}

// GET: Get session info
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "sessionId is required" },
      { status: 400 }
    );
  }

  const session = await getChatSession(sessionId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    messages: session.messages,
    email: session.email,
    escalated: session.escalated,
    ticketId: session.ticketId,
  });
}
