import { getPublishedArticles } from '@/lib/articles';
import { getAllCategories } from '@/lib/categories';
import HomeClient, { type Category } from './HomeClient';

// ISR: cache the rendered homepage and revalidate every 60s.
export const revalidate = 60;

// Fallback shown when no categories have been created yet.
const defaultCategories: Category[] = [
  { id: 'mitgliedschaft', name: 'Mitgliedschaft', icon: 'card', description: 'Verträge, Kündigung & Beitrag' },
  { id: 'training', name: 'Training', icon: 'dumbbell', description: 'Kurse, Geräte & Trainingsplan' },
  { id: 'studio', name: 'Studio', icon: 'building', description: 'Öffnungszeiten, Ausstattung & Standort' },
  { id: 'konto', name: 'Mein Konto', icon: 'user', description: 'Login, Profil & Einstellungen' },
  { id: 'sonstiges', name: 'Sonstiges', icon: 'more', description: 'Weitere Themen & Fragen' },
];

export default async function Home() {
  const [articles, fetchedCategories] = await Promise.all([
    getPublishedArticles(),
    getAllCategories(),
  ]);

  const categories: Category[] =
    fetchedCategories.length > 0 ? fetchedCategories : defaultCategories;

  return <HomeClient initialArticles={articles} initialCategories={categories} />;
}
