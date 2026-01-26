import { NextResponse } from 'next/server';
import { getAllCategories, migrateDefaultCategories, categoriesExist } from '@/lib/categories';

export async function GET() {
  try {
    // Check if categories exist, if not migrate defaults
    const exists = await categoriesExist();
    if (!exists) {
      await migrateDefaultCategories();
    }

    const categories = await getAllCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
