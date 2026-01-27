import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { getTicket } from "@/lib/tickets";

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// Simple keyword extraction and matching
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "der", "die", "das", "ein", "eine", "und", "oder", "aber", "ist", "sind",
    "war", "waren", "hat", "haben", "wird", "werden", "kann", "können", "muss",
    "müssen", "soll", "sollen", "ich", "du", "er", "sie", "es", "wir", "ihr",
    "nicht", "auch", "noch", "schon", "sehr", "mehr", "nur", "bei", "mit",
    "für", "von", "auf", "aus", "nach", "über", "unter", "vor", "hinter",
    "neben", "zwischen", "durch", "ohne", "gegen", "um", "an", "in", "zu",
    "als", "wenn", "weil", "dass", "ob", "wie", "was", "wer", "wo", "wann",
    "warum", "welche", "welcher", "welches", "hallo", "guten", "tag", "bitte",
    "danke", "liebe", "grüße", "mfg", "viele"
  ]);

  return text
    .toLowerCase()
    .replace(/[^\wäöüß\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
}

function calculateRelevanceScore(articleText: string, keywords: string[]): number {
  const articleLower = articleText.toLowerCase();
  let score = 0;

  for (const keyword of keywords) {
    // Count occurrences
    const regex = new RegExp(keyword, "gi");
    const matches = articleLower.match(regex);
    if (matches) {
      score += matches.length;
    }
  }

  return score;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ticket = await getTicket(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket nicht gefunden" }, { status: 404 });
    }

    // Get all published articles
    const articleIds: string[] = await kv.smembers("articles:ids") || [];
    if (articleIds.length === 0) {
      return NextResponse.json({ articles: [] });
    }

    const articles = await Promise.all(
      articleIds.map(async (articleId) => {
        const article = await kv.hgetall(`article:${articleId}`);
        return article ? { id: articleId, ...article } as Article : null;
      })
    );

    const publishedArticles = articles.filter(
      (article): article is Article => article !== null && article.published
    );

    // Extract keywords from ticket subject and messages
    const ticketText = `${ticket.subject} ${ticket.customerName}`;
    const keywords = extractKeywords(ticketText);

    if (keywords.length === 0) {
      // Return random 3 articles if no keywords
      return NextResponse.json({
        articles: publishedArticles.slice(0, 3).map(a => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
        })),
      });
    }

    // Score and sort articles by relevance
    const scoredArticles = publishedArticles.map(article => ({
      ...article,
      score: calculateRelevanceScore(
        `${article.title} ${article.content}`,
        keywords
      ),
    }));

    scoredArticles.sort((a, b) => b.score - a.score);

    // Return top 5 relevant articles
    const relevantArticles = scoredArticles
      .filter(a => a.score > 0)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.category,
        score: a.score,
      }));

    // If no relevant articles, return first 3 articles
    if (relevantArticles.length === 0) {
      return NextResponse.json({
        articles: publishedArticles.slice(0, 3).map(a => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          category: a.category,
        })),
      });
    }

    return NextResponse.json({ articles: relevantArticles });
  } catch (error) {
    console.error("Error fetching relevant articles:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
