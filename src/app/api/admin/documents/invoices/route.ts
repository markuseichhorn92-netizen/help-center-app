import { NextRequest, NextResponse } from 'next/server';
import { getInvoicesByMonth, getDocumentStats } from '@/lib/documents';

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invoicesByMonth = await getInvoicesByMonth();
    const stats = await getDocumentStats();

    return NextResponse.json({
      invoicesByMonth,
      stats,
    });
  } catch (error: unknown) {
    console.error('Invoices list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
