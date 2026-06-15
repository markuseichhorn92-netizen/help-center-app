import { kv } from './kv';
import { unstable_cache } from 'next/cache';

export interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Default categories for migration
export const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Mitgliedschaft', icon: 'card', description: 'Verträge, Kündigung & Beitrag', order: 0 },
  { name: 'Training', icon: 'dumbbell', description: 'Kurse, Geräte & Trainingsplan', order: 1 },
  { name: 'Studio', icon: 'building', description: 'Öffnungszeiten, Ausstattung & Standort', order: 2 },
  { name: 'Mein Konto', icon: 'user', description: 'Login, Profil & Einstellungen', order: 3 },
  { name: 'Sonstiges', icon: 'more', description: 'Weitere Themen & Fragen', order: 4 },
];

// Get all categories sorted by order (uncached KV read)
async function getAllCategoriesUncached(): Promise<Category[]> {
  try {
    const categoryIds = await kv.smembers('categories:ids');

    if (!categoryIds || categoryIds.length === 0) {
      return [];
    }

    const categories = await Promise.all(
      categoryIds.map(async (id) => {
        const category = await kv.hgetall(`category:${id}`);
        return category as unknown as Category;
      })
    );

    return categories
      .filter((c): c is Category => c !== null && Object.keys(c).length > 0)
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    // Degrade gracefully (e.g. KV unreachable during build-time prerender).
    console.error('Failed to read categories from KV:', error);
    return [];
  }
}

// Cached wrapper (60s). Categories change rarely; invalidate on write with
// revalidateTag('categories').
export const getAllCategories = unstable_cache(
  getAllCategoriesUncached,
  ['all-categories'],
  { revalidate: 60, tags: ['categories'] }
);

// Get category by ID
export async function getCategoryById(id: string): Promise<Category | null> {
  const category = await kv.hgetall(`category:${id}`);
  if (!category || Object.keys(category).length === 0) {
    return null;
  }
  return category as unknown as Category;
}

// Create a new category
export async function createCategory(
  data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Category> {
  // @ts-ignore crypto is available in Vercel Edge Runtime
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const category: Category = {
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  };

  await kv.hmset(`category:${id}`, category as unknown as Record<string, string>);
  await kv.sadd('categories:ids', id);

  return category;
}

// Update a category
export async function updateCategory(
  id: string,
  data: Partial<Omit<Category, 'id' | 'createdAt'>>
): Promise<Category | null> {
  const existing = await getCategoryById(id);
  if (!existing) {
    return null;
  }

  const updated: Category = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await kv.hmset(`category:${id}`, updated as unknown as Record<string, string>);

  return updated;
}

// Delete a category
export async function deleteCategory(id: string): Promise<boolean> {
  const existing = await getCategoryById(id);
  if (!existing) {
    return false;
  }

  await kv.del(`category:${id}`);
  await kv.srem('categories:ids', id);

  return true;
}

// Reorder categories
export async function reorderCategories(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map(async (id, index) => {
      await kv.hset(`category:${id}`, { order: index, updatedAt: new Date().toISOString() });
    })
  );
}

// Get article count per category
export async function getCategoryArticleCounts(): Promise<Record<string, number>> {
  const articleIds = await kv.smembers('articles:ids');
  const counts: Record<string, number> = {};

  if (!articleIds || articleIds.length === 0) {
    return counts;
  }

  await Promise.all(
    articleIds.map(async (id) => {
      const article = await kv.hgetall(`article:${id}`);
      if (article && typeof article === 'object' && 'category' in article) {
        const category = article.category as string;
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      }
    })
  );

  return counts;
}

// Migrate default categories to KV (run once)
export async function migrateDefaultCategories(): Promise<{ created: number; skipped: number }> {
  const existing = await getAllCategories();

  if (existing.length > 0) {
    return { created: 0, skipped: defaultCategories.length };
  }

  let created = 0;
  for (const cat of defaultCategories) {
    await createCategory(cat);
    created++;
  }

  return { created, skipped: 0 };
}

// Check if categories exist in KV
export async function categoriesExist(): Promise<boolean> {
  const categoryIds = await kv.smembers('categories:ids');
  return categoryIds && categoryIds.length > 0;
}
