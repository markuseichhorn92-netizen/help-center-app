import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { TicketMessage } from "./tickets";
import { getRelevantArticles, getKnowledgeBaseContext } from "./ai-chat";
import { FINN_KNOWLEDGE, FINN_PERSONALITY } from "./finn-knowledge";

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
  // Also increase ticket priority and set aiStatus to escalated
  await kv.hset(`ticket:${ticketId}`, { priority: "high", aiStatus: "escalated" });
}

/**
 * Get the AI status for a ticket
 */
export async function getAIStatus(ticketId: string): Promise<'active' | 'escalated' | 'disabled'> {
  const ticket = await kv.hgetall(`ticket:${ticketId}`);
  if (!ticket) return 'active';

  const aiStatus = (ticket as { aiStatus?: string }).aiStatus;
  if (aiStatus === 'escalated' || aiStatus === 'disabled') {
    return aiStatus;
  }
  return 'active';
}

/**
 * Set the AI status for a ticket
 */
export async function setAIStatus(ticketId: string, status: 'active' | 'escalated' | 'disabled'): Promise<void> {
  await kv.hset(`ticket:${ticketId}`, {
    aiStatus: status,
    updatedAt: new Date().toISOString()
  });

  // Also update the human_requested flag for backwards compatibility
  if (status === 'active') {
    await kv.del(`ticket:${ticketId}:human_requested`);
  } else {
    await kv.set(`ticket:${ticketId}:human_requested`, true);
  }
}

/**
 * Generate an auto-reply using AI with knowledge base context
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

    // Build conversation context from history
    let conversationContext = "";
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-5); // Last 5 messages
      conversationContext = recentMessages
        .map((msg) => {
          const sender = msg.sender === "customer" ? customerName : "Support";
          const cleanContent = msg.content.replace(/<[^>]*>/g, "").trim();
          return `${sender}: ${cleanContent}`;
        })
        .join("\n");
    }

    // Get additional knowledge context (articles + scraped knowledge base)
    console.log("[AI-AutoReply/Finn] Loading context for:", customerMessage);
    const searchQuery = `${ticketSubject} ${customerMessage}`;

    const [articlesContext, knowledgeContext] = await Promise.all([
      getRelevantArticles(searchQuery),
      getKnowledgeBaseContext(searchQuery),
    ]);

    console.log("[AI-AutoReply/Finn] Articles context length:", articlesContext.length);
    console.log("[AI-AutoReply/Finn] Knowledge context length:", knowledgeContext.length);

    // Build Finn's system prompt with full knowledge base
    const systemPrompt = `${FINN_PERSONALITY}

${FINN_KNOWLEDGE}

${articlesContext ? `\n=== ZUSÄTZLICHE HILFE-ARTIKEL ===\n${articlesContext}\n=== ENDE HILFE-ARTIKEL ===` : ""}
${knowledgeContext ? `\n=== ZUSÄTZLICHE WEBSITE-INFOS ===\n${knowledgeContext}\n=== ENDE WEBSITE-INFOS ===` : ""}

WICHTIGE REGELN:
- Du darfst KEINE Verträge kündigen oder ändern
- Du darfst KEINE verbindlichen Zusagen machen (außer den offiziellen Preisen oben)
- Bei Kündigungen, Beschwerden oder Vertragsfragen: Immer an Team verweisen
- Nutze die WISSENSBASIS oben für alle Antworten!
- JEDE Antwort muss auf Probetraining oder Mitgliedschaft hinführen!

ENDE JEDER ANTWORT:
- Entweder mit Call-to-Action für Probetraining/Mitgliedschaft
- ODER bei expliziter Nachfrage: "Für persönliche Beratung schreib 'Mitarbeiter'."`;

    const userPrompt = `Ticket-Betreff: ${ticketSubject}

${conversationContext ? `Bisheriger Verlauf:\n${conversationContext}\n\n` : ""}Aktuelle Nachricht von ${customerName}:
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

    // Ensure there's a call-to-action (probetraining link preferred, or human hint as fallback)
    const probetrainingLink = "https://angebot.fit-inn-trier.de/#probetraining";
    const hasCallToAction = content.includes("probetraining") || 
                            content.includes("Probetraining") || 
                            content.includes("angebot.fit-inn-trier.de") ||
                            content.includes("Mitgliedschaft") ||
                            content.includes("vorbeikommen") ||
                            content.includes("Termin");
    
    if (!hasCallToAction) {
      content = content.trim() + `\n\n💪 Lust auf ein kostenloses Probetraining? Hier buchen: ${probetrainingLink}`;
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
 * (Returns false if human was requested or AI was disabled by admin)
 */
export async function isAutoReplyEnabled(ticketId: string): Promise<boolean> {
  const aiStatus = await getAIStatus(ticketId);

  // AI is only enabled if status is 'active'
  return aiStatus === 'active';
}
