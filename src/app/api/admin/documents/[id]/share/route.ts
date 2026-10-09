import { NextRequest, NextResponse } from 'next/server';
import { createShareLink, getShareLinksForDocument, deleteShareLink } from '@/lib/share';
import { getDocument } from '@/lib/documents';
import { requireAdmin } from '@/lib/admin-auth';

// GET: List share links for a document
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    const shares = await getShareLinksForDocument(id);

    return NextResponse.json({ shares });
  } catch (error: unknown) {
    console.error('Share links get error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST: Create a new share link
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    const body = await req.json();
    const { expiresAt, password } = body;

    const shareLink = await createShareLink(id, {
      expiresAt,
      password,
      createdBy: 'admin',
    });

    // Generate the share URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/${shareLink.token}`;

    return NextResponse.json({
      ...shareLink,
      shareUrl,
    });
  } catch (error: unknown) {
    console.error('Share link create error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE: Delete a share link
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 });
    }

    const success = await deleteShareLink(token);

    if (!success) {
      return NextResponse.json({ error: 'Share-Link nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Share link delete error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
