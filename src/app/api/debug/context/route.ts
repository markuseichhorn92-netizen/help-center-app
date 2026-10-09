import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { isAdminRequest } from "@/lib/admin-auth";

// Debug endpoint to check what data is available for AI chat
// PROTECTED: Requires admin session or cron secret
export async function GET(req: NextRequest) {
  // Security: Require admin session or cron secret
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  const isAdmin = await isAdminRequest(req);
  const isValidCronSecret = expectedSecret && cronSecret === expectedSecret;

  if (!isAdmin && !isValidCronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const showContent = req.nextUrl.searchParams.get("content") === "true";
    const search = req.nextUrl.searchParams.get("search")?.toLowerCase();

    // Check articles
    const articleIds: string[] = (await kv.smembers("articles:ids")) || [];
    const articlesRaw = await Promise.all(
      articleIds.map(async (id) => {
        const article = await kv.hgetall<{
          title: string;
          content: string;
          published: boolean | string;
        }>(`article:${id}`);
        return { id, ...article };
      })
    );

    // Filter by search term if provided
    let articles = articlesRaw;
    if (search) {
      articles = articlesRaw.filter(
        (a) =>
          a.title?.toLowerCase().includes(search) ||
          a.content?.toLowerCase().includes(search)
      );
    }

    const articlesSample = articles.slice(0, 5).map((a) => ({
      id: a.id,
      title: a.title || "N/A",
      published: a.published,
      contentLength: a.content?.length || 0,
      contentPreview: showContent
        ? a.content?.replace(/<[^>]*>/g, "").substring(0, 300)
        : undefined,
    }));

    // Check knowledge base
    const knowledgeIds: string[] = (await kv.smembers("knowledge:ids")) || [];
    const knowledgeRaw = await Promise.all(
      knowledgeIds.map(async (id) => {
        const entry = await kv.hgetall<{
          title: string;
          content: string;
          url: string;
        }>(`knowledge:${id}`);
        return { id, ...entry };
      })
    );

    // Filter by search term if provided
    let knowledge = knowledgeRaw;
    if (search) {
      knowledge = knowledgeRaw.filter(
        (k) =>
          k.title?.toLowerCase().includes(search) ||
          k.content?.toLowerCase().includes(search)
      );
    }

    const knowledgeSample = knowledge.slice(0, 5).map((k) => ({
      id: k.id,
      title: k.title || "N/A",
      url: k.url || "N/A",
      contentLength: k.content?.length || 0,
      contentPreview: showContent ? k.content?.substring(0, 300) : undefined,
    }));

    return NextResponse.json({
      hint: "Add ?content=true to see content previews, ?search=keyword to filter",
      articles: {
        totalCount: articleIds.length,
        matchingCount: search ? articles.length : undefined,
        sample: articlesSample,
      },
      knowledgeBase: {
        totalCount: knowledgeIds.length,
        matchingCount: search ? knowledge.length : undefined,
        sample: knowledgeSample,
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
