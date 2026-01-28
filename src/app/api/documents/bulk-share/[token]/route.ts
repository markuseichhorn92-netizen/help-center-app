import { NextRequest, NextResponse } from 'next/server';
import { validateBulkShareAccess, getBulkShareLink } from '@/lib/share';
import archiver from 'archiver';
import { Readable } from 'stream';

// GET: Access bulk shared documents (PUBLIC - no auth required)
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
    const shareLink = await getBulkShareLink(token);
    if (!shareLink) {
      return NextResponse.json({ error: 'Link nicht gefunden' }, { status: 404 });
    }

    // If password required but not provided, return password prompt
    if (shareLink.hasPassword && !password) {
      return NextResponse.json({
        requiresPassword: true,
        message: 'Dieser Link ist passwortgeschützt',
        documentCount: shareLink.documentIds.length,
        title: shareLink.title,
      }, { status: 401 });
    }

    // Validate access
    const result = await validateBulkShareAccess(token, password || undefined);

    if (!result.valid || !result.documents) {
      return NextResponse.json({
        error: result.error || 'Zugriff verweigert',
        requiresPassword: shareLink.hasPassword && result.error === 'Falsches Passwort',
      }, { status: result.error === 'Falsches Passwort' ? 401 : 403 });
    }

    const documents = result.documents;

    // If download requested, create ZIP archive
    if (download) {
      const archive = archiver('zip', { zlib: { level: 5 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk: Buffer) => chunks.push(chunk));

      // Add all documents to archive
      for (const doc of documents) {
        try {
          const response = await fetch(doc.url);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            archive.append(Buffer.from(buffer), { name: doc.filename });
          }
        } catch (e) {
          console.error(`Failed to fetch document ${doc.id}:`, e);
        }
      }

      await archive.finalize();

      // Wait for archive to finish
      await new Promise<void>((resolve) => {
        archive.on('end', resolve);
      });

      const zipBuffer = Buffer.concat(chunks);
      const filename = result.title
        ? `${result.title.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_')}.zip`
        : `dokumente_${new Date().toISOString().split('T')[0]}.zip`;

      return new NextResponse(zipBuffer, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    // Return document list for preview
    return NextResponse.json({
      title: result.title,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        url: doc.url,
        contentType: doc.contentType,
        size: doc.size,
        isInvoice: doc.isInvoice,
        invoiceDate: doc.invoiceDate,
        invoiceVendor: doc.invoiceVendor,
        invoiceAmount: doc.invoiceAmount,
      })),
    });
  } catch (error: unknown) {
    console.error('Bulk share access error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export const maxDuration = 60;
