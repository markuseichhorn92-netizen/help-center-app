import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, getCategoryArticleCounts } from '@/lib/categories';

function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth || !basicAuth.startsWith('Basic ')) {
    return false;
  }
  const credentials = Buffer.from(basicAuth.split(' ')[1], 'base64').toString();
  const [user, pass] = credentials.split(':');
  return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
}

// GET all categories with article counts
export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [categories, articleCounts] = await Promise.all([
      getAllCategories(),
      getCategoryArticleCounts(),
    ]);

    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      articleCount: articleCounts[cat.id] || 0,
    }));

    return NextResponse.json(categoriesWithCounts);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST create new category
export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, icon, description } = body;

    if (!name || !icon) {
      return NextResponse.json(
        { error: 'Name and icon are required' },
        { status: 400 }
      );
    }

    // Get current categories to determine order
    const categories = await getAllCategories();
    const order = categories.length;

    const category = await createCategory({
      name,
      icon,
      description: description || '',
      order,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
