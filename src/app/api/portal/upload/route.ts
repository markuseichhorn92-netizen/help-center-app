import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { verifyPortalSession } from "@/lib/portal";

// Allowed file types for customer uploads
const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // Text
  "text/plain",
];

const ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  // Verify portal session
  const sessionCookie = req.cookies.get("portal_session");
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const session = await verifyPortalSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Session ungültig" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Keine Datei hochgeladen." },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Datei zu groß (max. 5 MB)." },
        { status: 400 }
      );
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    const isAllowedType = ALLOWED_TYPES.includes(file.type);
    const isAllowedExtension = ALLOWED_EXTENSIONS.includes(fileExtension);

    if (!isAllowedType && !isAllowedExtension) {
      return NextResponse.json(
        {
          error:
            "Dateityp nicht erlaubt. Erlaubt: Bilder (JPG, PNG, GIF), PDF, Word-Dokumente, Textdateien.",
        },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 100);

    // Upload to Vercel Blob
    const blob = await put(
      `portal-attachments/${Date.now()}-${sanitizedName}`,
      file,
      {
        access: "public",
        contentType: file.type,
      }
    );

    return NextResponse.json({
      id: crypto.randomUUID(),
      filename: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: unknown) {
    console.error("Portal upload error:", error);
    return NextResponse.json(
      { error: "Fehler beim Hochladen." },
      { status: 500 }
    );
  }
}
