import { NextRequest, NextResponse } from 'next/server';
import { magicline } from '@/lib/magicline';
import { cookies } from 'next/headers';

// Verify admin session
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  return !!sessionToken;
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

    let customers = [];

    // Search by member number first (most specific)
    if (memberNumber || query.match(/^M-?\d+$/i)) {
      const mNum = memberNumber || query.replace(/^M-?/i, 'M-');
      const customer = await magicline.getCustomerByMemberNumber(mNum);
      if (customer) {
        customers = [customer];
      }
    }
    // Search by email
    else if (email || query.includes('@')) {
      const searchEmail = email || query;
      const result = await magicline.searchCustomers({ 
        email: searchEmail, 
        size: Math.min(size, 100) 
      });
      customers = result.result || [];
    }
    // Search by phone
    else if (phone || query.match(/^[\d\s+\-()]+$/) && query.replace(/\D/g, '').length >= 6) {
      const searchPhone = phone || query;
      const result = await magicline.searchCustomers({ 
        phone: searchPhone, 
        size: Math.min(size, 100) 
      });
      customers = result.result || [];
    }
    // Search by name (requires fetching all and filtering)
    else if (query.length >= 2) {
      const result = await magicline.searchCustomers({ 
        name: query, 
        size: Math.min(size * 5, 500) // Fetch more since we filter client-side
      });
      customers = result.result || [];
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
