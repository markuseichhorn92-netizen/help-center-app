import { NextRequest, NextResponse } from "next/server";
import { getAllTags, addCustomTag, removeCustomTag } from "@/lib/tickets";

// GET: Get all available tags
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tags = await getAllTags();
    return NextResponse.json({ tags });
  } catch (error: unknown) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

// POST: Add a new custom tag
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, color } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

    const tag = {
      id,
      name: name.trim(),
      color: color || "gray",
    };

    await addCustomTag(tag);

    return NextResponse.json({ tag });
  } catch (error: unknown) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

// DELETE: Remove a custom tag
export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get("admin_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tagId } = await req.json();

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    await removeCustomTag(tagId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting tag:", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}
