import type { MetadataRoute } from 'next';
import { getCategories, getPublishedArticles, SITE } from '@/lib/help/data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, categories] = await Promise.all([getPublishedArticles(), getCategories()]);
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    ...categories.map((c) => ({ url: `${SITE}/kategorie/${c.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: `${SITE}/artikel/${a.slug}`, lastModified: a.updatedAt, changeFrequency: 'monthly' as const, priority: 0.8 })),
  ];
}
