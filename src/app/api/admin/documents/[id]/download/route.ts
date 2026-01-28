import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/documents';

// GET: Download document with Content-Disposition: attachment
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const document = await getDocument(id);

    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    // Fetch the file from Vercel Blob
    const response = await fetch(document.url);
    if (!response.ok) {
      return NextResponse.json({ error: 'Datei nicht gefunden' }, { status: 404 });
    }

    const blob = await response.blob();

    // Return with download header
    return new NextResponse(blob, {
      headers: {
        'Content-Type': document.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(document.filename)}"`,
        'Content-Length': document.size?.toString() || blob.size.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Document download error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
