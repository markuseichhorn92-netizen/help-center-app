import Anthropic from "@anthropic-ai/sdk";
import { kv } from "@vercel/kv";
import { v4 as uuidv4 } from "uuid";

const anthropic = new Anthropic();

// Chat session interface
export interface ChatSession {
  [key: string]: string | boolean | ChatMessage[] | undefined;
  sessionId: string;
  email?: string;
  messages: ChatMessage[];
  createdAt: string;
  ticketId?: string;
  escalated: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

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
  "hilfe",
  "sprechen",
];

/**
 * Check if message indicates user wants human support
 */
export function wantsHumanSupport(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return HUMAN_KEYWORDS.some((keyword) => lowerMessage.includes(keyword));
}

/**
 * Create a new chat session
 */
export async function createChatSession(email?: string): Promise<ChatSession> {
  const sessionId = uuidv4();

  const session: ChatSession = {
    sessionId,
    email: email || "", // KV doesn't support null values
    messages: [],
    createdAt: new Date().toISOString(),
    escalated: false,
  };

  // Store with messages as JSON string (like updateChatSession does)
  // Filter out empty values to avoid KV issues
  const toStore: Record<string, string | boolean> = {
    sessionId: session.sessionId,
    messages: JSON.stringify(session.messages),
    createdAt: session.createdAt,
    escalated: session.escalated,
  };

  // Only add email if it has a value
  if (email) {
    toStore.email = email;
  }

  await kv.hset(`chat:session:${sessionId}`, toStore);
  // Sessions expire after 24 hours
  await kv.expire(`chat:session:${sessionId}`, 24 * 60 * 60);

  return session;
}

/**
 * Get chat session by ID
 */
export async function getChatSession(sessionId: string): Promise<ChatSession | null> {
  const data = await kv.hgetall<ChatSession>(`chat:session:${sessionId}`);
  if (!data) return null;

  // Parse messages if stored as string
  if (typeof data.messages === "string") {
    try {
      data.messages = JSON.parse(data.messages);
    } catch {
      data.messages = [];
    }
  }

  // Ensure messages is always an array
  if (!Array.isArray(data.messages)) {
    data.messages = [];
  }

  return data;
}

/**
 * Update chat session
 */
export async function updateChatSession(
  sessionId: string,
  updates: Partial<ChatSession>
): Promise<void> {
  const current = await getChatSession(sessionId);
  if (!current) return;

  const updated = { ...current, ...updates };

  // Build storage object, filtering out null/undefined values (KV doesn't support null)
  const toStore: Record<string, string | boolean> = {
    sessionId: updated.sessionId,
    messages: JSON.stringify(updated.messages),
    createdAt: updated.createdAt,
    escalated: updated.escalated,
  };

  if (updated.email) {
    toStore.email = updated.email;
  }
  if (updated.ticketId) {
    toStore.ticketId = updated.ticketId;
  }

  await kv.hset(`chat:session:${sessionId}`, toStore);
}

/**
 * Add message to chat session
 */
export async function addMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const session = await getChatSession(sessionId);
  if (!session) return;

  session.messages.push(message);
  await updateChatSession(sessionId, { messages: session.messages });
}

/**
 * Get relevant articles for chat context
 */
async function getRelevantArticles(query: string): Promise<string> {
  try {
    // Get all published articles
    const articleIds: string[] = (await kv.smembers("articles:ids")) || [];
    console.log("[AI-Chat] Article IDs:", articleIds.length);
    if (articleIds.length === 0) return "";

    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const article = await kv.hgetall<{
          title: string;
          content: string;
          published: boolean | string;
        }>(`article:${id}`);
        if (!article) return null;
        const isPublished = article.published === true || article.published === "true";
        if (!isPublished) return null;
        return { id, title: article.title, content: article.content };
      })
    );

    const publishedArticles = articles.filter((a) => a !== null);
    console.log("[AI-Chat] Published articles:", publishedArticles.length);
    if (publishedArticles.length === 0) return "";

    // If there are only a few articles (<=5), include all of them for context
    if (publishedArticles.length <= 5) {
      return publishedArticles
        .map((a) => {
          const cleanContent = a.content
            .replace(/<[^>]*>/g, "")
            .substring(0, 1000)
            .trim();
          return `Artikel: "${a.title}"\nInhalt: ${cleanContent}`;
        })
        .join("\n\n---\n\n");
    }

    // For larger article sets, use keyword matching
    const queryLower = query.toLowerCase();
    // Split query and also include common German variations
    const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    const scored = publishedArticles.map((article) => {
      const titleLower = article.title.toLowerCase();
      const contentLower = article.content.toLowerCase().replace(/<[^>]*>/g, "");
      let score = 0;

      // Check for full query match (highest priority)
      if (titleLower.includes(queryLower) || contentLower.includes(queryLower)) {
        score += 10;
      }

      // Check individual keywords
      for (const keyword of keywords) {
        if (titleLower.includes(keyword)) score += 3;
        if (contentLower.includes(keyword)) score += 1;
      }
      return { ...article, score };
    });

    // Get top matches, or fall back to first 3 if no matches
    let relevant = scored
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // If no keyword matches, return first 3 articles as general context
    if (relevant.length === 0) {
      relevant = publishedArticles.slice(0, 3).map((a) => ({ ...a, score: 0 }));
    }

    return relevant
      .map((a) => {
        const cleanContent = a.content
          .replace(/<[^>]*>/g, "")
          .substring(0, 1000)
          .trim();
        return `Artikel: "${a.title}"\nInhalt: ${cleanContent}`;
      })
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Error getting relevant articles:", error);
    return "";
  }
}

/**
 * Get knowledge base entries for context
 */
async function getKnowledgeBaseContext(query: string): Promise<string> {
  try {
    // Get knowledge base entry IDs from the set (not using kv.keys which is expensive)
    const entryIds: string[] = (await kv.smembers("knowledge:ids")) || [];
    console.log("[AI-Chat] Knowledge base entry IDs:", entryIds.length);
    if (entryIds.length === 0) return "";

    const entries = await Promise.all(
      entryIds.map(async (id) => {
        const entry = await kv.hgetall<{
          title: string;
          content: string;
          keywords: string;
          url: string;
        }>(`knowledge:${id}`);
        return entry;
      })
    );

    const validEntries = entries.filter((e) => e !== null);
    if (validEntries.length === 0) return "";

    // If there are only a few entries (<=5), include all of them
    if (validEntries.length <= 5) {
      return validEntries
        .map((e) => {
          const cleanContent = (e.content || "").substring(0, 1000).trim();
          return `Website-Info: "${e.title}"\nQuelle: ${e.url || "Website"}\nInhalt: ${cleanContent}`;
        })
        .join("\n\n---\n\n");
    }

    // For larger sets, use keyword matching
    const queryLower = query.toLowerCase();
    const keywords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    const scored = validEntries.map((entry) => {
      const titleLower = (entry.title || "").toLowerCase();
      const contentLower = (entry.content || "").toLowerCase();
      const keywordsLower = (entry.keywords || "").toLowerCase();
      let score = 0;

      // Full query match
      if (titleLower.includes(queryLower) || contentLower.includes(queryLower)) {
        score += 10;
      }

      for (const keyword of keywords) {
        if (titleLower.includes(keyword)) score += 3;
        if (keywordsLower.includes(keyword)) score += 2;
        if (contentLower.includes(keyword)) score += 1;
      }
      return { ...entry, score };
    });

    let relevant = scored
      .filter((e) => e.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    // Fallback to first 3 if no matches
    if (relevant.length === 0) {
      relevant = validEntries.slice(0, 3).map((e) => ({ ...e, score: 0 }));
    }

    return relevant
      .map((e) => {
        const cleanContent = (e.content || "").substring(0, 1000).trim();
        return `Website-Info: "${e.title}"\nQuelle: ${e.url || "Website"}\nInhalt: ${cleanContent}`;
      })
      .join("\n\n---\n\n");
  } catch (error) {
    console.error("Error getting knowledge base:", error);
    return "";
  }
}

/**
 * Generate AI chat response
 */
export async function generateChatResponse(params: {
  sessionId: string;
  userMessage: string;
}): Promise<{
  content: string;
  success: boolean;
  wantsHuman: boolean;
  error?: string;
}> {
  try {
    const { sessionId, userMessage } = params;

    // Check if user wants human support
    const wantsHuman = wantsHumanSupport(userMessage);

    // DEBUG: Log what we're loading
    console.log("[AI-Chat] User message:", userMessage);

    // Get session for conversation history
    const session = await getChatSession(sessionId);
    const conversationHistory = session?.messages || [];

    // Get relevant context
    const [articlesContext, knowledgeContext] = await Promise.all([
      getRelevantArticles(userMessage),
      getKnowledgeBaseContext(userMessage),
    ]);

    // DEBUG: Log context lengths
    console.log("[AI-Chat] Articles context length:", articlesContext.length);
    console.log("[AI-Chat] Knowledge context length:", knowledgeContext.length);
    if (articlesContext.length > 0) {
      console.log("[AI-Chat] Articles preview:", articlesContext.substring(0, 200));
    }
    if (knowledgeContext.length > 0) {
      console.log("[AI-Chat] Knowledge preview:", knowledgeContext.substring(0, 200));
    }

    // Build conversation history for AI
    const historyMessages = conversationHistory.slice(-6).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const systemPrompt = `Du bist der freundliche Support-Assistent von FIT INN Trier, einem Fitnessstudio.

DEINE AUFGABEN:
- Beantworte Kundenfragen höflich und hilfsbereit basierend auf den bereitgestellten Informationen
- Halte dich kurz (2-3 Sätze maximal)
- WICHTIG: Durchsuche die HILFE-ARTIKEL unten sorgfältig nach relevanten Informationen BEVOR du antwortest
- Wenn die Antwort in den Artikeln steht, gib sie wieder - erfinde NICHTS
- Bei komplexen Fragen oder wenn die Info NICHT in den Artikeln steht, empfehle den Kontakt zu einem Mitarbeiter

WICHTIGE REGELN:
- Du darfst KEINE Verträge kündigen oder ändern
- Du darfst KEINE verbindlichen Preise oder Zusagen machen
- Bei Kündigungen, Beschwerden oder Vertragsfragen: Immer an Mitarbeiter verweisen
- Sage NIE "ich habe die Information nicht" wenn sie in den Artikeln unten steht!

${articlesContext ? `\n=== HILFE-ARTIKEL (durchsuche diese ZUERST!) ===\n${articlesContext}\n=== ENDE HILFE-ARTIKEL ===` : "\n(Keine Hilfe-Artikel verfügbar)"}
${knowledgeContext ? `\n=== WISSENSBASIS ===\n${knowledgeContext}\n=== ENDE WISSENSBASIS ===` : ""}

BEENDE JEDE Antwort mit:
"💬 Für persönliche Hilfe schreibe 'Mitarbeiter'."`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: userMessage },
      ],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text content in response");
    }

    let content = textContent.text;

    // Ensure the human hint is present
    const humanHint = "💬 Für persönliche Hilfe schreibe 'Mitarbeiter'.";
    if (!content.includes("Mitarbeiter") && !content.includes("💬")) {
      content = content.trim() + "\n\n" + humanHint;
    }

    return { content, success: true, wantsHuman };
  } catch (error: any) {
    console.error("AI chat error:", error);
    return {
      content: "Entschuldigung, es gab einen technischen Fehler. Bitte versuche es erneut oder schreibe 'Mitarbeiter' für persönliche Hilfe.",
      success: false,
      wantsHuman: false,
      error: error.message || "KI-Fehler",
    };
  }
}

/**
 * Get welcome message for new chat
 */
export function getWelcomeMessage(): string {
  return `Hallo! 👋 Ich bin der FIT INN Support-Assistent.

Ich kann dir bei Fragen zu deiner Mitgliedschaft, Training, Studio und mehr helfen.

Wie kann ich dir heute helfen?

💬 Für persönliche Hilfe schreibe jederzeit 'Mitarbeiter'.`;
}
