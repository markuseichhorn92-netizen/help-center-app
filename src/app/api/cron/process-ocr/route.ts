import { NextRequest, NextResponse } from 'next/server';
import { getDocumentsPendingOcr } from '@/lib/documents';
import { processDocumentWithInvoiceDetection } from '@/lib/ocr';

// This endpoint processes pending OCR jobs
// Recommended: Every 5-10 minutes via Vercel Cron

export async function GET(req: NextRequest) {
  // Verify cron secret for security
  const cronSecret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret && cronSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get pending documents (limit to 5 per run to avoid timeouts)
    const pendingDocuments = await getDocumentsPendingOcr(5);

    if (pendingDocuments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No documents pending OCR',
        processed: 0,
        failed: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // Process documents with invoice detection
    let processed = 0;
    let failed = 0;
    const errors: Array<{ documentId: string; error: string }> = [];

    for (const doc of pendingDocuments) {
      const result = await processDocumentWithInvoiceDetection(doc.id);

      if (result.success) {
        processed++;
      } else {
        failed++;
        if (result.error) {
          errors.push({ documentId: doc.id, error: result.error });
        }
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      errors,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('Cron process-ocr error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Also allow POST for webhooks/cron services that use POST
export async function POST(req: NextRequest) {
  return GET(req);
}
