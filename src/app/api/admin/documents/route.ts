import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createDocument, listDocuments, getDocumentStats, searchDocuments } from '@/lib/documents';

// GET: List documents or search
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const ticketId = searchParams.get('ticketId');
    const ocrStatus = searchParams.get('ocrStatus') as 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // If search query provided, search documents
    if (query) {
      const results = await searchDocuments(query);
      return NextResponse.json({
        documents: results.map(r => ({
          ...r.document,
          matchedText: r.matchedText,
          score: r.score,
        })),
        total: results.length,
      });
    }

    // Otherwise, list documents
    const { documents, total } = await listDocuments({
      ticketId: ticketId || undefined,
      ocrStatus: ocrStatus || undefined,
      limit,
      offset,
    });

    // Get stats
    const stats = await getDocumentStats();

    return NextResponse.json({
      documents,
      total,
      stats,
    });
  } catch (error: unknown) {
    console.error('Documents list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST: Upload new document
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ticketId = formData.get('ticketId') as string | null;
    const tags = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Keine Datei hochgeladen.' }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Datei zu groß (max. 10MB).' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`documents/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    });

    // Create document record
    const document = await createDocument({
      filename: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type,
      ticketId: ticketId || undefined,
      uploadedBy: 'admin',
      tags: tags ? tags.split(',').map(t => t.trim()) : undefined,
    });

    return NextResponse.json(document);
  } catch (error: unknown) {
    console.error('Document upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Fehler beim Hochladen.',
    }, { status: 500 });
  }
}
