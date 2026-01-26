import { NextRequest, NextResponse } from 'next/server';
import { reorderCategories } from '@/lib/categories';

function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth || !basicAuth.startsWith('Basic ')) {
    return false;
  }
  const credentials = Buffer.from(basicAuth.split(' ')[1], 'base64').toString();
  const [user, pass] = credentials.split(':');
  return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
}

// POST reorder categories
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderedIds } = body;

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'orderedIds array is required' },
        { status: 400 }
      );
    }

    await reorderCategories(orderedIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering categories:', error);
    return NextResponse.json(
      { error: 'Failed to reorder categories' },
      { status: 500 }
    );
  }
}
