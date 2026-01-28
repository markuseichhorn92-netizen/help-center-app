import { NextRequest, NextResponse } from 'next/server';
import { createBulkShareLink, getBulkShareLink, deleteBulkShareLink } from '@/lib/share';

// POST: Create a bulk share link for multiple documents
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { documentIds, expiresAt, password, title } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ error: 'Mindestens ein Dokument erforderlich' }, { status: 400 });
    }

    if (documentIds.length > 50) {
      return NextResponse.json({ error: 'Maximal 50 Dokumente pro Share-Link' }, { status: 400 });
    }

    const shareLink = await createBulkShareLink(documentIds, {
      expiresAt,
      password,
      createdBy: 'admin',
      title,
    });

    // Generate the share URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/bulk/${shareLink.token}`;

    return NextResponse.json({
      ...shareLink,
      shareUrl,
    });
  } catch (error: unknown) {
    console.error('Bulk share link create error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET: Get a bulk share link info
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 });
    }

    const shareLink = await getBulkShareLink(token);
    if (!shareLink) {
      return NextResponse.json({ error: 'Share-Link nicht gefunden' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const shareUrl = `${baseUrl}/share/bulk/${shareLink.token}`;

    return NextResponse.json({
      ...shareLink,
      shareUrl,
    });
  } catch (error: unknown) {
    console.error('Bulk share link get error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE: Delete a bulk share link
export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token erforderlich' }, { status: 400 });
    }

    const success = await deleteBulkShareLink(token);

    if (!success) {
      return NextResponse.json({ error: 'Share-Link nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Bulk share link delete error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
