import { NextRequest, NextResponse } from 'next/server';
import { magicline } from '@/lib/magicline';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/admin-auth';

// Verify admin session (signiert)
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return !!(await verifySessionToken(cookieStore.get('admin_session')?.value));
}

// GET /api/admin/magicline/customers
// Search for customers in Magicline
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    const memberNumber = searchParams.get('memberNumber');
    const size = parseInt(searchParams.get('size') || '20', 10);

    // If no search criteria provided, return empty
    if (!query && !email && !phone && !memberNumber) {
      return NextResponse.json({ customers: [], total: 0 });
    }

    let customers: Array<{
      id: number;
      customerNumber: string;
      firstName: string;
      lastName: string;
      email?: string | null;
      phonePrivate?: string | null;
      phonePrivateMobile?: string | null;
      phoneBusiness?: string | null;
      phoneBusinessMobile?: string | null;
      status?: string;
      city?: string | null;
      street?: string | null;
      houseNumber?: string | null;
      zipCode?: string | null;
      dateOfBirth?: string;
      createdDateTime?: string;
      accessRefusal?: boolean;
      idlePeriods?: Array<{
        startDate: string;
        endDate: string;
        reason: string;
        contract?: { id: number; rateName: string };
        unlimited: boolean;
      }>;
    }> = [];

    // Search by member number first (most specific)
    if (memberNumber || query.match(/^M-?\d+$/i)) {
      const mNum = memberNumber || query.replace(/^M-?/i, 'M-');
      const customer = await magicline.getCustomerByMemberNumber(mNum);
      if (customer) {
        customers = [customer];
      }
    }
    // Search by email (paginated search - API doesn't support email param)
    else if (email || query.includes('@')) {
      const searchEmail = email || query;
      customers = await magicline.searchCustomersByEmail(searchEmail, Math.min(size, 20));
    }
    // Search by phone (paginated search - API doesn't support phone param)
    else if (phone || (query.match(/^[\d\s+\-()]+$/) && query.replace(/\D/g, '').length >= 6)) {
      const searchPhone = phone || query;
      customers = await magicline.searchCustomersByPhone(searchPhone, Math.min(size, 20));
    }
    // Search by name (paginated search through all customers)
    else if (query.length >= 2) {
      customers = await magicline.searchCustomersByName(query, Math.min(size, 20));
    }

    // Format response - only include relevant fields
    const formattedCustomers = customers.slice(0, size).map(c => ({
      id: c.id,
      customerNumber: c.customerNumber,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: `${c.firstName} ${c.lastName}`.trim(),
      email: c.email,
      phone: c.phonePrivate || c.phonePrivateMobile || c.phoneBusiness || c.phoneBusinessMobile,
      status: c.status,
      city: c.city,
      street: c.street ? `${c.street} ${c.houseNumber || ''}`.trim() : null,
      zipCode: c.zipCode,
      dateOfBirth: c.dateOfBirth,
      createdDateTime: c.createdDateTime,
      accessRefusal: c.accessRefusal,
      idlePeriods: c.idlePeriods,
    }));

    return NextResponse.json({
      customers: formattedCustomers,
      total: formattedCustomers.length,
    });

  } catch (error) {
    console.error('[Magicline API] Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search customers', message: (error as Error).message },
      { status: 500 }
    );
  }
}
