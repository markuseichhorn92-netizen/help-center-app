import { NextRequest, NextResponse } from 'next/server';
import { magicline } from '@/lib/magicline';
import { cookies } from 'next/headers';

// Verify admin session
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  return !!sessionToken;
}

// GET /api/admin/magicline/customers/[id]
// Get customer details with contracts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const customerId = parseInt(id, 10);

    if (isNaN(customerId)) {
      return NextResponse.json({ error: 'Invalid customer ID' }, { status: 400 });
    }

    // Fetch customer and contracts in parallel
    const [customer, contracts] = await Promise.all([
      magicline.getCustomer(customerId),
      magicline.getCustomerContracts(customerId),
    ]);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Format response
    const response = {
      customer: {
        id: customer.id,
        customerNumber: customer.customerNumber,
        firstName: customer.firstName,
        lastName: customer.lastName,
        fullName: `${customer.firstName} ${customer.lastName}`.trim(),
        email: customer.email,
        phone: customer.phonePrivate || customer.phonePrivateMobile,
        phoneMobile: customer.phonePrivateMobile,
        phoneBusiness: customer.phoneBusiness,
        status: customer.status,
        gender: customer.gender,
        dateOfBirth: customer.dateOfBirth,
        address: {
          street: customer.street,
          houseNumber: customer.houseNumber,
          zipCode: customer.zipCode,
          city: customer.city,
          country: customer.country,
          formatted: customer.street 
            ? `${customer.street} ${customer.houseNumber || ''}, ${customer.zipCode} ${customer.city}`.trim()
            : null,
        },
        bankAccount: customer.bankAccount ? {
          accountHolder: customer.bankAccount.accountHolder,
          bankName: customer.bankAccount.bankName,
          iban: customer.bankAccount.iban ? 
            `${customer.bankAccount.iban.slice(0, 4)}****${customer.bankAccount.iban.slice(-4)}` : null,
        } : null,
        accessRefusal: customer.accessRefusal,
        createdDateTime: customer.createdDateTime,
        idlePeriods: customer.idlePeriods?.map(p => ({
          startDate: p.startDate,
          endDate: p.endDate,
          reason: p.reason,
          rateName: p.contract?.rateName,
          unlimited: p.unlimited,
        })),
      },
      contracts: contracts.map(c => ({
        id: c.id,
        rateName: c.rateName,
        startDate: c.startDate,
        endDate: c.endDate,
        cancellationDate: c.cancellationDate,
        status: c.status,
        monthlyFee: c.monthlyFee,
        currency: c.currency || 'EUR',
        isActive: !c.endDate || new Date(c.endDate) > new Date(),
        isCancelled: !!c.cancellationDate,
      })),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Magicline API] Get customer error:', error);
    return NextResponse.json(
      { error: 'Failed to get customer', message: (error as Error).message },
      { status: 500 }
    );
  }
}
