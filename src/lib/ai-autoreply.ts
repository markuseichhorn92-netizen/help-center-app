import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { TicketMessage } from "./tickets";

const anthropic = new Anthropic();

// Keywords that indicate the customer wants to talk to a human
const HUMAN_KEYWORDS = [
  "mitarbeiter",
  "mensch",
  "person",
  "agent",
  "support",
  "echte person",
  "echter mensch",
  "jemand",
  "ansprechpartner",
];

/**
 * Check if customer message indicates they want to talk to a human
 */
export function wantsHuman(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return HUMAN_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Check if human was requested for this ticket
 */
export async function isHumanRequested(ticketId: string): Promise<boolean> {
  const requested = await kv.get<boolean>(`ticket:${ticketId}:human_requested`);
  return requested === true;
}

/**
 * Mark that human was requested for this ticket
 */
export async function markHumanRequested(ticketId: string): Promise<void> {
  await kv.set(`ticket:${ticketId}:human_requested`, true);
  // Also increase ticket priority
  await kv.hset(`ticket:${ticketId}`, { priority: "high" });
}

/**
 * Generate an auto-reply using AI
 */
export async function generateAutoReply(params: {
  customerMessage: string;
  customerName: string;
  ticketSubject: string;
  conversationHistory?: TicketMessage[];
  isWhatsApp?: boolean;
}): Promise<{ content: string; success: boolean; error?: string }> {
  try {
    const { customerMessage, customerName, ticketSubject, conversationHistory, isWhatsApp } = params;

    // Build conversation context
    let context = "";
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-5); // Last 5 messages
      context = recentMessages
        .map((msg) => {
          const sender = msg.sender === "customer" ? customerName : "Support";
          const cleanContent = msg.content.replace(/<[^>]*>/g, "").trim();
          return `${sender}: ${cleanContent}`;
        })
        .join("\n");
    }

    const systemPrompt = `Du bist der freundliche Support-Assistent von FIT INN Trier, einem Fitnessstudio.
Deine Aufgaben:
- Beantworte Kundenfragen höflich und hilfsbereit
- Halte dich kurz (2-3 Sätze maximal)
- Wenn du dir bei einer Antwort nicht sicher bist, sage dass ein Mitarbeiter sich melden wird
- Verwende eine freundliche, aber professionelle Sprache
- Du darfst keine Verträge kündigen, Preise nennen oder verbindliche Zusagen machen

WICHTIG: Beende JEDE Antwort mit diesem Hinweis:
"Möchtest du mit einem Mitarbeiter sprechen? Schreibe einfach 'Mitarbeiter'."`;

    const userPrompt = `Ticket-Betreff: ${ticketSubject}

${context ? `Bisheriger Verlauf:\n${context}\n\n` : ""}Aktuelle Nachricht von ${customerName}:
${customerMessage}

Antworte kurz und hilfreich auf diese Nachricht.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    let content = textContent.text;

    // Ensure the human hint is present
    const humanHint = "Möchtest du mit einem Mitarbeiter sprechen? Schreibe einfach 'Mitarbeiter'.";
    if (!content.includes("Mitarbeiter")) {
      content = content.trim() + "\n\n" + humanHint;
    }

    // Format for WhatsApp (no HTML)
    if (isWhatsApp) {
      content = content.replace(/<[^>]*>/g, "");
    }

    return { content, success: true };
  } catch (error: any) {
    console.error("AI auto-reply error:", error);
    return {
      content: "",
      success: false,
      error: error.message || "KI-Fehler",
    };
  }
}

/**
 * Check if AI auto-reply is enabled for this ticket
 * (Returns false if human was requested)
 */
export async function isAutoReplyEnabled(ticketId: string): Promise<boolean> {
  const humanRequested = await isHumanRequested(ticketId);
  if (humanRequested) {
    return false;
  }

  // Could add additional settings here (e.g., global toggle, per-ticket settings)
  return true;
}
