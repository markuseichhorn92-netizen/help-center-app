import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

interface QuickReply {
  id: string;
  title: string;
  content: string;
}

// GET - Get all quick replies
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const replies = await kv.get<QuickReply[]>("admin:quick-replies") || [];
    return NextResponse.json({ replies });
  } catch (error) {
    console.error("Error getting quick replies:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Add a new quick reply
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content required" }, { status: 400 });
    }

    const replies = await kv.get<QuickReply[]>("admin:quick-replies") || [];

    const newReply: QuickReply = {
      id: crypto.randomUUID(),
      title,
      content,
    };

    replies.push(newReply);
    await kv.set("admin:quick-replies", replies);

    return NextResponse.json({ reply: newReply });
  } catch (error) {
    console.error("Error creating quick reply:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE - Delete a quick reply
export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const replies = await kv.get<QuickReply[]>("admin:quick-replies") || [];
    const updatedReplies = replies.filter((r) => r.id !== id);

    await kv.set("admin:quick-replies", updatedReplies);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quick reply:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
