import { NextRequest, NextResponse } from 'next/server';
import { getDocument, updateDocument, deleteDocument, linkDocumentToTicket, unlinkDocumentFromTicket } from '@/lib/documents';
import { processDocumentWithInvoiceDetection } from '@/lib/ocr';

// GET: Get single document
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

    return NextResponse.json(document);
  } catch (error: unknown) {
    console.error('Document get error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// PUT: Update document (tags, ticket link)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    const document = await getDocument(id);
    if (!document) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    // Handle ticket linking
    if (body.ticketId !== undefined) {
      if (body.ticketId) {
        await linkDocumentToTicket(id, body.ticketId);
      } else if (document.ticketId) {
        await unlinkDocumentFromTicket(id);
      }
    }

    // Handle other updates
    const updates: Record<string, unknown> = {};

    if (body.tags !== undefined) {
      updates.tags = body.tags;
    }

    // Invoice fields
    if (body.isInvoice !== undefined) {
      updates.isInvoice = body.isInvoice;
    }
    if (body.invoiceDate !== undefined) {
      updates.invoiceDate = body.invoiceDate || undefined;
    }
    if (body.invoiceNumber !== undefined) {
      updates.invoiceNumber = body.invoiceNumber || undefined;
    }
    if (body.invoiceAmount !== undefined) {
      updates.invoiceAmount = body.invoiceAmount || undefined;
    }
    if (body.invoiceVendor !== undefined) {
      updates.invoiceVendor = body.invoiceVendor || undefined;
    }

    // Folder
    if (body.folderId !== undefined) {
      const { moveDocumentToFolder } = await import('@/lib/documents');
      await moveDocumentToFolder(id, body.folderId || null);
    }

    if (Object.keys(updates).length > 0) {
      await updateDocument(id, updates);
    }

    // Return updated document
    const updated = await getDocument(id);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('Document update error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// DELETE: Delete document
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = await deleteDocument(id);

    if (!success) {
      return NextResponse.json({ error: 'Dokument nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Document delete error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST: Trigger OCR for document
export async function POST(
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

    // Trigger OCR processing with invoice detection
    const result = await processDocumentWithInvoiceDetection(id);

    if (result.success) {
      const updated = await getDocument(id);
      return NextResponse.json({
        success: true,
        document: updated,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Document OCR error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
