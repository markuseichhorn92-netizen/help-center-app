import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { createDocument, listDocuments, getDocumentStats, searchDocuments, listFolders, getDocumentsInFolder, moveDocumentToFolder } from '@/lib/documents';
import { requireAdmin } from '@/lib/admin-auth';

// GET: List documents or search
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const ticketId = searchParams.get('ticketId');
    const folderId = searchParams.get('folderId');
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
        folders: [],
        total: results.length,
      });
    }

    // Get folders in current location (only for folder-based browsing)
    const folders = folderId !== undefined
      ? await listFolders(folderId || undefined)
      : await listFolders(undefined);

    // Get documents - either in folder or all (excluding invoices)
    let documents;
    let total;

    if (ticketId) {
      // Get documents by ticket
      const result = await listDocuments({ ticketId, ocrStatus: ocrStatus || undefined, limit, offset });
      documents = result.documents;
      total = result.total;
    } else if (folderId !== undefined) {
      // Get documents in specific folder (or root if empty string)
      documents = await getDocumentsInFolder(folderId || null);
      total = documents.length;
    } else {
      // Get all documents
      const result = await listDocuments({ ocrStatus: ocrStatus || undefined, limit, offset });
      documents = result.documents.filter(d => !d.isInvoice);
      total = result.total;
    }

    // Get stats
    const stats = await getDocumentStats();

    return NextResponse.json({
      documents,
      folders,
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
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const ticketId = formData.get('ticketId') as string | null;
    const folderId = formData.get('folderId') as string | null;
    const isInvoice = formData.get('isInvoice') as string | null;
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

    // Create document record (only pass fields if they have values)
    const documentData: Parameters<typeof createDocument>[0] = {
      filename: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type,
      uploadedBy: 'admin',
    };

    if (ticketId) {
      documentData.ticketId = ticketId;
    }

    if (tags) {
      const parsedTags = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      if (parsedTags.length > 0) {
        documentData.tags = parsedTags;
      }
    }

    const document = await createDocument(documentData);

    // Move to folder if specified
    if (folderId) {
      await moveDocumentToFolder(document.id, folderId);
    }

    // Mark as invoice if specified
    if (isInvoice === 'true') {
      const { updateDocument } = await import('@/lib/documents');
      await updateDocument(document.id, { isInvoice: true });
    }

    return NextResponse.json(document);
  } catch (error: unknown) {
    console.error('Document upload error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Fehler beim Hochladen.',
    }, { status: 500 });
  }
}
