import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsForExport, createDocumentZip, generateZipFilename, ExportOptions } from '@/lib/export';

export const maxDuration = 60; // Allow up to 60 seconds for large exports

// POST: Export documents as ZIP
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const options: ExportOptions = {
      documentIds: body.documentIds,
      month: body.month,
      year: body.year,
      invoicesOnly: body.invoicesOnly,
    };

    // Get documents to export
    const documents = await getDocumentsForExport(options);

    if (documents.length === 0) {
      return NextResponse.json({ error: 'Keine Dokumente zum Exportieren gefunden' }, { status: 400 });
    }

    // Limit to 50 documents to prevent timeout
    if (documents.length > 50) {
      return NextResponse.json({
        error: `Zu viele Dokumente (${documents.length}). Maximal 50 Dokumente pro Export erlaubt.`,
      }, { status: 400 });
    }

    // Create ZIP archive
    const zipBuffer = await createDocumentZip(documents);
    const filename = generateZipFilename(options);

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(zipBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Export error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Export fehlgeschlagen',
    }, { status: 500 });
  }
}
