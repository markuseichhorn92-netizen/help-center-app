import { NextRequest, NextResponse } from 'next/server';
import { validateShareAccess, getShareLink } from '@/lib/share';

// GET: Access shared document (PUBLIC - no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { searchParams } = new URL(req.url);
    const password = searchParams.get('password');
    const download = searchParams.get('download') === 'true';

    // First check if share link exists and if it requires password
    const shareLink = await getShareLink(token);
    if (!shareLink) {
      return NextResponse.json({ error: 'Link nicht gefunden' }, { status: 404 });
    }

    // If password required but not provided, return password prompt
    if (shareLink.hasPassword && !password) {
      return NextResponse.json({
        requiresPassword: true,
        message: 'Dieser Link ist passwortgeschützt',
      }, { status: 401 });
    }

    // Validate access
    const result = await validateShareAccess(token, password || undefined);

    if (!result.valid || !result.document) {
      return NextResponse.json({
        error: result.error || 'Zugriff verweigert',
        requiresPassword: shareLink.hasPassword && result.error === 'Falsches Passwort',
      }, { status: result.error === 'Falsches Passwort' ? 401 : 403 });
    }

    const document = result.document;

    // If download requested, redirect to document URL with download header
    if (download) {
      // Fetch the file and return with download header
      const response = await fetch(document.url);
      if (!response.ok) {
        return NextResponse.json({ error: 'Datei nicht verfügbar' }, { status: 404 });
      }

      const blob = await response.blob();
      return new NextResponse(blob, {
        headers: {
          'Content-Type': document.contentType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(document.filename)}"`,
        },
      });
    }

    // Return document info for preview
    return NextResponse.json({
      id: document.id,
      filename: document.filename,
      url: document.url,
      contentType: document.contentType,
      size: document.size,
    });
  } catch (error: unknown) {
    console.error('Share access error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
