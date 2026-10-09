import { NextRequest, NextResponse } from 'next/server';
import { getInvoicesByMonth, getDocumentStats, listInvoices, Document } from '@/lib/documents';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);

    // Filter parameters
    const query = searchParams.get('q');
    const vendor = searchParams.get('vendor');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');
    const sortBy = searchParams.get('sortBy') as 'date' | 'amount' | 'vendor' | null;
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    const hasFilters = query || vendor || dateFrom || dateTo || amountMin || amountMax;

    if (hasFilters || sortBy) {
      // Get all invoices and filter
      let invoices = await listInvoices();

      // Text search (in filename, vendor, invoice number)
      if (query) {
        const q = query.toLowerCase();
        invoices = invoices.filter(inv =>
          inv.filename.toLowerCase().includes(q) ||
          inv.invoiceVendor?.toLowerCase().includes(q) ||
          inv.invoiceNumber?.toLowerCase().includes(q) ||
          inv.ocrText?.toLowerCase().includes(q)
        );
      }

      // Vendor filter
      if (vendor) {
        const v = vendor.toLowerCase();
        invoices = invoices.filter(inv =>
          inv.invoiceVendor?.toLowerCase().includes(v)
        );
      }

      // Date range filter
      if (dateFrom) {
        const from = new Date(dateFrom);
        invoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoiceDate || inv.uploadedAt);
          return invDate >= from;
        });
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        invoices = invoices.filter(inv => {
          const invDate = new Date(inv.invoiceDate || inv.uploadedAt);
          return invDate <= to;
        });
      }

      // Amount range filter
      if (amountMin) {
        const min = parseFloat(amountMin);
        invoices = invoices.filter(inv =>
          inv.invoiceAmount !== undefined && inv.invoiceAmount >= min
        );
      }
      if (amountMax) {
        const max = parseFloat(amountMax);
        invoices = invoices.filter(inv =>
          inv.invoiceAmount !== undefined && inv.invoiceAmount <= max
        );
      }

      // Sorting
      if (sortBy) {
        const order = sortOrder === 'asc' ? 1 : -1;
        invoices.sort((a, b) => {
          switch (sortBy) {
            case 'date':
              const dateA = new Date(a.invoiceDate || a.uploadedAt);
              const dateB = new Date(b.invoiceDate || b.uploadedAt);
              return (dateA.getTime() - dateB.getTime()) * order;
            case 'amount':
              const amtA = a.invoiceAmount || 0;
              const amtB = b.invoiceAmount || 0;
              return (amtA - amtB) * order;
            case 'vendor':
              const vendorA = a.invoiceVendor || '';
              const vendorB = b.invoiceVendor || '';
              return vendorA.localeCompare(vendorB) * order;
            default:
              return 0;
          }
        });
      }

      // Group by month
      const grouped: Record<string, Document[]> = {};
      for (const invoice of invoices) {
        const dateStr = invoice.invoiceDate || invoice.uploadedAt;
        const date = new Date(dateStr);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[monthKey]) {
          grouped[monthKey] = [];
        }
        grouped[monthKey].push(invoice);
      }

      // Get unique vendors for autocomplete
      const allInvoices = await listInvoices();
      const vendors = [...new Set(allInvoices.map(i => i.invoiceVendor).filter(Boolean))] as string[];

      const stats = await getDocumentStats();
      return NextResponse.json({
        invoicesByMonth: grouped,
        stats,
        vendors,
        totalFiltered: invoices.length,
      });
    }

    // No filters - return regular grouped invoices
    const invoicesByMonth = await getInvoicesByMonth();
    const stats = await getDocumentStats();

    // Get unique vendors for autocomplete
    const allInvoices = await listInvoices();
    const vendors = [...new Set(allInvoices.map(i => i.invoiceVendor).filter(Boolean))] as string[];

    return NextResponse.json({
      invoicesByMonth,
      stats,
      vendors,
    });
  } catch (error: unknown) {
    console.error('Invoices list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
