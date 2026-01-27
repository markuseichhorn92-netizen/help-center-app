import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

// Debug endpoint to check what data is available for AI chat
export async function GET() {
  try {
    // Check articles
    const articleIds: string[] = (await kv.smembers("articles:ids")) || [];
    const articles = await Promise.all(
      articleIds.slice(0, 5).map(async (id) => {
        const article = await kv.hgetall<{
          title: string;
          published: boolean | string;
        }>(`article:${id}`);
        return {
          id,
          title: article?.title || "N/A",
          published: article?.published,
        };
      })
    );

    // Check knowledge base
    const knowledgeIds: string[] = (await kv.smembers("knowledge:ids")) || [];
    const knowledge = await Promise.all(
      knowledgeIds.slice(0, 5).map(async (id) => {
        const entry = await kv.hgetall<{
          title: string;
          url: string;
        }>(`knowledge:${id}`);
        return {
          id,
          title: entry?.title || "N/A",
          url: entry?.url || "N/A",
        };
      })
    );

    return NextResponse.json({
      articles: {
        totalCount: articleIds.length,
        sample: articles,
      },
      knowledgeBase: {
        totalCount: knowledgeIds.length,
        sample: knowledge,
      },
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
