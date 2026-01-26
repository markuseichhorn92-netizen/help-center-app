import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Check authentication
function isAuthenticated(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const base64Credentials = authHeader.split(" ")[1];
  const credentials = atob(base64Credentials);
  const [username, password] = credentials.split(":");

  return (
    username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS
  );
}

// POST /api/admin/ai - Generate article content with AI
export async function POST(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, topic, content, instruction } = await request.json();

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
Beginne direkt mit dem Inhalt, ohne den Titel zu wiederholen.`;

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
      const { customerMessage, customerName, ticketSubject } = await request.json().catch(() => ({}));

      if (!customerMessage) {
        return NextResponse.json(
          { message: "Bitte geben Sie die Kundennachricht an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein freundlicher und professioneller Kundenservice-Mitarbeiter für FIT INN, ein Fitnessstudio in Trier.
Du schreibst hilfreiche, freundliche und lösungsorientierte Antworten auf Kundenanfragen auf Deutsch.
Deine Antworten sind:
- Höflich und freundlich (aber nicht übertrieben)
- Direkt und lösungsorientiert
- Professionell aber persönlich
- Nicht zu lang (max 150 Wörter)

Beginne NICHT mit "Sehr geehrte/r" - verwende stattdessen den Vornamen oder "Hallo".
Beende mit "Mit freundlichen Grüßen" oder ähnlich, aber OHNE Signatur (die wird automatisch hinzugefügt).`;

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
Gib nur den korrigierten Text zurück, ohne Erklärungen.`;

      userPrompt = `Korrigiere und verbessere folgenden Kundenservice-Text:\n\n${content}`;

    } else if (action === "ticket_rewrite") {
      // Rewrite text in a different tone
      const { tone } = await request.json().catch(() => ({}));

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
Gib nur den umgeschriebenen Text zurück, ohne Erklärungen.`;

      userPrompt = `Schreibe folgenden Text ${toneDesc} um:\n\n${content}`;

    } else if (action === "ticket_custom") {
      // Custom instruction for ticket reply
      if (!content || !instruction) {
        return NextResponse.json(
          { message: "Bitte geben Sie Text und Anweisung an." },
          { status: 400 }
        );
      }

      systemPrompt = `Du bist ein Kundenservice-Textexperte für ein Fitnessstudio.
Bearbeite den Text nach der gegebenen Anweisung.
Gib nur den bearbeiteten Text zurück, ohne Erklärungen.`;

      userPrompt = `Anweisung: ${instruction}\n\nText:\n${content}`;

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
