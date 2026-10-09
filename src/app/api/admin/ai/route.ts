import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getKnowledgeContext } from "@/lib/knowledge-base";
import { requireAdmin } from '@/lib/admin-auth';

// POST /api/admin/ai - Generate article content with AI
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { action, topic, content, instruction, customerMessage, customerName, ticketSubject, tone, conversationHistory, ticketInfo } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { message: "ANTHROPIC_API_KEY ist nicht konfiguriert. Bitte fügen Sie den API-Key zur .env.local Datei hinzu." },
        { status: 500 }
      );
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let systemPrompt = "";
    let userPrompt = "";
    
    // Get knowledge base context
    const knowledgeContext = await getKnowledgeContext();

    if (action === "generate") {
      // Generate a complete article from a topic
      if (!topic) {
        return NextResponse.json(
          { message: "Bitte geben Sie ein Thema an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein professioneller Hilfe-Artikel-Autor für FIT INN, ein Fitnessstudio in Trier.
Du schreibst klare, freundliche und hilfreiche Artikel auf Deutsch.
Deine Artikel sind:
- Gut strukturiert mit Überschriften (verwende HTML: <h2>, <h3>)
- Verwenden Aufzählungslisten (<ul><li>) wenn sinnvoll
- Freundlich und einladend im Ton
- Praktisch und lösungsorientiert
- Nicht zu lang (ca. 200-400 Wörter)

Formatiere den Inhalt als HTML für einen Rich-Text-Editor.
Verwende KEINE <h1> Tags (der Titel wird separat angezeigt).
Beginne direkt mit dem Inhalt, ohne den Titel zu wiederholen.

KRITISCH WICHTIG - ANTI-HALLUZINATION:
- Nutze AUSSCHLIESSLICH die unten stehenden Unternehmensinformationen als Faktenquelle
- ERFINDE KEINE Informationen wie Öffnungszeiten, Preise, Kurse, Kontaktdaten oder andere Details
- Wenn eine spezifische Information nicht in den Unternehmensinformationen enthalten ist, schreibe allgemein oder weise darauf hin, dass man sich direkt informieren sollte
- Bei Unsicherheit lieber weniger spezifisch sein als falsche Details zu erfinden

${knowledgeContext}`;

      userPrompt = `Schreibe einen Hilfe-Artikel zum Thema: "${topic}"

Der Artikel sollte für Mitglieder und Interessenten eines Fitnessstudios hilfreich sein.`;

    } else if (action === "improve") {
      // Improve existing content
      if (!content) {
        return NextResponse.json(
          { message: "Bitte geben Sie den zu verbessernden Inhalt an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein professioneller Lektor für Hilfe-Artikel.
Du verbesserst Texte auf Deutsch und machst sie:
- Klarer und verständlicher
- Besser strukturiert
- Grammatikalisch korrekt
- Professionell aber freundlich

Behalte die HTML-Formatierung bei und verbessere sie wenn nötig.
Gib nur den verbesserten Text zurück, ohne Erklärungen.`;

      userPrompt = `Verbessere den folgenden Hilfe-Artikel-Text:\n\n${content}`;

    } else if (action === "expand") {
      // Expand bullet points or short text
      if (!content) {
        return NextResponse.json(
          { message: "Bitte geben Sie den zu erweiternden Inhalt an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein professioneller Hilfe-Artikel-Autor.
Du erweiterst Stichpunkte und kurze Texte zu vollständigen, gut lesbaren Absätzen auf Deutsch.
Behalte die HTML-Formatierung bei.
Füge sinnvolle Strukturelemente hinzu (Listen, Überschriften) wenn passend.
Gib nur den erweiterten Text zurück, ohne Erklärungen.`;

      userPrompt = `Erweitere die folgenden Stichpunkte/kurzen Text zu einem vollständigen Hilfe-Artikel:\n\n${content}`;

    } else if (action === "custom") {
      // Custom instruction
      if (!content || !instruction) {
        return NextResponse.json(
          { message: "Bitte geben Sie Inhalt und Anweisung an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein professioneller Hilfe-Artikel-Autor für ein Fitnessstudio.
Du bearbeitest Texte nach spezifischen Anweisungen auf Deutsch.
Behalte die HTML-Formatierung bei.
Gib nur den bearbeiteten Text zurück, ohne Erklärungen.`;

      userPrompt = `Anweisung: ${instruction}\n\nText:\n${content}`;

    } else if (action === "ticket_reply") {
      // Generate a ticket reply based on customer message
      if (!customerMessage) {
        return NextResponse.json(
          { message: "Bitte geben Sie die Kundennachricht an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein freundlicher und professioneller Kundenservice-Mitarbeiter für FIT INN, ein Fitnessstudio in Trier.
Du schreibst hilfreiche, freundliche und lösungsorientierte Antworten auf Kundenanfragen auf Deutsch.

FORMATIERUNG - SEHR WICHTIG:
- Formatiere deine Antwort mit HTML für gute Lesbarkeit
- Verwende <p> Tags für jeden Absatz
- Strukturiere klar: Begrüßung → Hauptinhalt → Abschluss (jeweils eigener Absatz)
- Halte Absätze kurz (2-3 Sätze pro Absatz)
- Bei mehreren Punkten oder Schritten nutze <ul><li> Listen
- KEINE <br> Tags verwenden - nur <p> für Absätze

Deine Antworten sind:
- Höflich und freundlich (aber nicht übertrieben)
- Direkt und lösungsorientiert
- Professionell aber persönlich
- Übersichtlich strukturiert
- Nicht zu lang (max 150 Wörter)

Beginne NICHT mit "Sehr geehrte/r" - verwende stattdessen den Vornamen oder "Hallo".
Beende mit "Mit freundlichen Grüßen" oder ähnlich, aber OHNE Signatur (die wird automatisch hinzugefügt).

KRITISCH WICHTIG - ANTI-HALLUZINATION:
- Nutze AUSSCHLIESSLICH die unten stehenden Unternehmensinformationen als Faktenquelle
- ERFINDE KEINE Informationen wie Öffnungszeiten, Preise, Kurse, Kontaktdaten, Ansprechpartner oder andere spezifische Details
- Wenn der Kunde nach etwas fragt, das nicht in den Informationen enthalten ist, bitte ihn höflich, sich direkt an das Studio zu wenden oder auf der Website nachzuschauen
- NIEMALS Zahlen, Zeiten oder Preise erfinden - im Zweifel auf die Website oder direkten Kontakt verweisen

${knowledgeContext}`;

      userPrompt = `Kundenname: ${customerName || 'Kunde'}
Betreff: ${ticketSubject || 'Anfrage'}
Kundennachricht: ${customerMessage}

Schreibe eine freundliche und hilfreiche Antwort.`;

    } else if (action === "ticket_correct") {
      // Correct/improve existing reply text
      if (!content) {
        return NextResponse.json(
          { message: "Bitte geben Sie den zu korrigierenden Text an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein Lektor für Kundenservice-Texte.
Korrigiere Rechtschreibung, Grammatik und verbessere den Stil.
Behalte die ursprüngliche Bedeutung und den freundlichen Ton bei.

FORMATIERUNG:
- Behalte oder verbessere die HTML-Struktur
- Trenne logische Abschnitte mit <p> Tags
- Falls der Text keine Absätze hat, füge sie sinnvoll hinzu
- Verwende <ul><li> für Aufzählungen wenn passend

Gib nur den korrigierten Text zurück, ohne Erklärungen.`;

      userPrompt = `Korrigiere und verbessere folgenden Kundenservice-Text:\n\n${content}`;

    } else if (action === "ticket_rewrite") {
      // Rewrite text in a different tone
      if (!content) {
        return NextResponse.json(
          { message: "Bitte geben Sie den umzuschreibenden Text an." },
          { status: 400 }
        );
      }

      const toneDescriptions: Record<string, string> = {
        formal: "formeller und professioneller",
        friendly: "freundlicher und persönlicher",
        short: "kürzer und prägnanter",
        detailed: "ausführlicher und detaillierter",
      };

      const toneDesc = toneDescriptions[tone] || "freundlicher";

      systemPrompt = `Du bist ein Kundenservice-Textexperte.
Schreibe den Text ${toneDesc} um.
Behalte die wesentliche Information bei.

FORMATIERUNG:
- Behalte die Absatz-Struktur bei oder verbessere sie
- Verwende <p> Tags für Absätze
- Strukturiere übersichtlich: Begrüßung, Hauptteil, Abschluss

Gib nur den umgeschriebenen Text zurück, ohne Erklärungen.`;

      userPrompt = `Schreibe folgenden Text ${toneDesc} um:\n\n${content}`;

    } else if (action === "ticket_custom") {
      // Custom instruction for ticket reply - can work with or without existing content
      // Now includes full conversation history for context-aware responses
      if (!instruction) {
        return NextResponse.json(
          { message: "Bitte geben Sie eine Anweisung an." },
          { status: 400 }
        );
      }

      // Format conversation history for context
      let conversationContext = "";
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        const formattedMessages = conversationHistory
          .slice(-10) // Last 10 messages for context
          .map((msg: { sender: string; senderName: string; content: string; createdAt: string }) => {
            const role = msg.sender === 'customer' ? 'KUNDE' : 'SUPPORT';
            // Strip HTML tags for cleaner context - with null check
            const cleanContent = (msg.content || '').replace(/<[^>]*>/g, '').trim();
            const senderName = msg.senderName || (msg.sender === 'customer' ? 'Kunde' : 'Support');
            return `[${role}] ${senderName}: ${cleanContent}`;
          })
          .join('\n\n');

        conversationContext = `
--- BISHERIGER GESPRÄCHSVERLAUF ---
${formattedMessages}
--- ENDE GESPRÄCHSVERLAUF ---`;
      }

      // Format ticket info
      let ticketContext = "";
      if (ticketInfo) {
        ticketContext = `
--- TICKET-INFORMATIONEN ---
Ticket-Nr: ${ticketInfo.ticketNumber || 'Unbekannt'}
Betreff: ${ticketInfo.subject || 'Kein Betreff'}
Kunde: ${ticketInfo.customerName || 'Unbekannt'}
E-Mail: ${ticketInfo.customerEmail || 'Unbekannt'}
Status: ${ticketInfo.status || 'Unbekannt'}
--- ENDE TICKET-INFORMATIONEN ---`;
      }

      if (content && content.trim()) {
        // Modify existing text based on instruction
        systemPrompt = `Du bist ein Kundenservice-Textexperte für FIT INN, ein Fitnessstudio in Trier.
Bearbeite den Text nach der gegebenen Anweisung.

Du hast Zugriff auf den bisherigen Gesprächsverlauf und die Ticket-Informationen, um den Kontext zu verstehen.
Nutze diese Informationen, um eine passende und kontextbezogene Antwort zu formulieren.

FORMATIERUNG - SEHR WICHTIG:
- Behalte oder verbessere die HTML-Struktur
- Verwende <p> Tags für Absätze
- Strukturiere übersichtlich: Begrüßung → Hauptinhalt → Abschluss
- Halte Absätze kurz (2-3 Sätze)
- Bei Aufzählungen nutze <ul><li> Listen

Gib nur den bearbeiteten Text zurück, ohne Erklärungen.

KRITISCH WICHTIG - ANTI-HALLUZINATION:
- ERFINDE KEINE spezifischen Informationen wie Öffnungszeiten, Preise, Kurse oder Kontaktdaten
- Bei Unsicherheit auf Website oder direkten Kontakt verweisen

${knowledgeContext}`;

        userPrompt = `${ticketContext}
${conversationContext}

ANWEISUNG: ${instruction}

AKTUELLER TEXT ZUM BEARBEITEN:
${content}`;
      } else {
        // Generate new text based on instruction (no existing content)
        systemPrompt = `Du bist ein freundlicher Kundenservice-Mitarbeiter für FIT INN, ein Fitnessstudio in Trier.
Schreibe eine Kundenservice-Antwort basierend auf der gegebenen Anweisung.

Du hast Zugriff auf den bisherigen Gesprächsverlauf und die Ticket-Informationen.
Nutze diese Informationen, um eine passende, kontextbezogene und logische Antwort zu formulieren.
Beziehe dich auf das, was der Kunde geschrieben hat, und antworte entsprechend.

FORMATIERUNG - SEHR WICHTIG:
- Formatiere deine Antwort mit HTML für gute Lesbarkeit
- Verwende <p> Tags für jeden Absatz
- Strukturiere klar: Begrüßung → Hauptinhalt → Abschluss (jeweils eigener Absatz)
- Halte Absätze kurz (2-3 Sätze pro Absatz)
- Bei mehreren Punkten oder Schritten nutze <ul><li> Listen
- KEINE <br> Tags verwenden - nur <p> für Absätze

Deine Antwort sollte:
- Freundlich und professionell sein
- Direkt und lösungsorientiert
- Auf den Kontext des Gesprächs eingehen
- Übersichtlich strukturiert
- Nicht zu lang (max 150 Wörter)
Gib nur den Text zurück, ohne Erklärungen.

KRITISCH WICHTIG - ANTI-HALLUZINATION:
- ERFINDE KEINE spezifischen Informationen wie Öffnungszeiten, Preise, Kurse oder Kontaktdaten
- Bei Unsicherheit auf Website oder direkten Kontakt verweisen

${knowledgeContext}`;

        userPrompt = `${ticketContext}
${conversationContext}

ANWEISUNG: ${instruction}

Schreibe eine passende Kundenservice-Antwort basierend auf dem Kontext und der Anweisung.`;
      }

    } else {
      return NextResponse.json(
        { message: "Ungültige Aktion. Erlaubt: generate, improve, expand, custom" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { message: "Keine Textantwort von der KI erhalten." },
        { status: 500 }
      );
    }

    // For generate action, also create a suggested title
    let title = "";
    if (action === "generate") {
      const titleMessage = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: `Erstelle einen kurzen, prägnanten Titel (max 60 Zeichen) für einen Hilfe-Artikel zum Thema: "${topic}". Gib nur den Titel zurück, ohne Anführungszeichen oder Erklärungen.`,
          },
        ],
      });

      const titleContent = titleMessage.content.find((block) => block.type === "text");
      if (titleContent && titleContent.type === "text") {
        title = titleContent.text.trim();
      }
    }

    return NextResponse.json({
      content: textContent.text,
      title: title || undefined,
    });

  } catch (error: any) {
    console.error("AI generation error:", error);

    if (error.status === 401) {
      return NextResponse.json(
        { message: "Ungültiger Anthropic API-Key. Bitte überprüfen Sie Ihre Konfiguration." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: error.message || "Fehler bei der KI-Generierung" },
      { status: 500 }
    );
  }
}
