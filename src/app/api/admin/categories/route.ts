import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, getCategoryArticleCounts } from '@/lib/categories';
import { requireAdmin } from '@/lib/admin-auth';

// GET all categories with article counts
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

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
  const denied = await requireAdmin(req);
  if (denied) return denied;

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
