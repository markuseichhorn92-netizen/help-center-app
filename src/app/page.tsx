"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import SearchAutocomplete from '@/components/SearchAutocomplete';

interface Category {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

// Default categories
const defaultCategories: Category[] = [
  { id: 'mitgliedschaft', name: 'Mitgliedschaft', icon: 'card', description: 'Verträge, Kündigung & Beitrag' },
  { id: 'training', name: 'Training', icon: 'dumbbell', description: 'Kurse, Geräte & Trainingsplan' },
  { id: 'studio', name: 'Studio', icon: 'building', description: 'Öffnungszeiten, Ausstattung & Standort' },
  { id: 'konto', name: 'Mein Konto', icon: 'user', description: 'Login, Profil & Einstellungen' },
  { id: 'sonstiges', name: 'Sonstiges', icon: 'more', description: 'Weitere Themen & Fragen' },
];

function CategoryIcon({ icon, className = "w-6 h-6" }: { icon: string; className?: string }) {
  switch (icon) {
    case 'card':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      );
    case 'dumbbell':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 8h2v8H4V8zm14 0h2v8h-2V8zM6 10h2v4H6v-4zm10 0h2v4h-2v-4zM8 11h8v2H8v-2z" />
        </svg>
      );
    case 'building':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case 'user':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case 'more':
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

async function getArticles(): Promise<Article[]> {
  const res = await fetch('/api/articles', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch articles');
  }
  return res.json();
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch('/api/categories', { cache: 'no-store' });
    if (!res.ok) {
      return defaultCategories;
    }
    const categories = await res.json();
    return categories.length > 0 ? categories : defaultCategories;
  } catch {
    return defaultCategories;
  }
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedArticles, fetchedCategories] = await Promise.all([
          getArticles(),
          getCategories()
        ]);
        setArticles(fetchedArticles);
        setFilteredArticles(fetchedArticles);
        setCategories(fetchedCategories);
      } catch (err) {
        setError('Artikel konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    let filtered = articles;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    setFilteredArticles(filtered);
  }, [searchQuery, selectedCategory, articles]);

  // Get article count per category
  const getCategoryArticleCount = (categoryId: string) => {
    return articles.filter(article => article.category === categoryId).length;
  };

  return (
    <div className="animate-fade-in">
      {/* Hero Section - Full Width */}
      <section className="w-full bg-hero-gradient">
        <div className="text-center py-16 md:py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1D1D1F] dark:text-white tracking-tight leading-tight">
              Wie können wir
              <br />
              dir helfen?
            </h1>
            <p className="mt-6 text-lg text-[#6E6E73] dark:text-[#D2D2D7] max-w-lg mx-auto">
              Finde Antworten auf deine Fragen im FIT INN Hilfe-Center.
            </p>

            {/* Search Input with Autocomplete */}
            <div className="mt-10 max-w-xl mx-auto">
              <SearchAutocomplete
                placeholder="Suche nach Artikeln..."
                onSearch={(query) => setSearchQuery(query)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] dark:text-white tracking-tight mb-8">
          Themen durchsuchen
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((category) => {
            const count = getCategoryArticleCount(category.id);
            const isSelected = selectedCategory === category.id;

            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                className={`group relative p-5 rounded-apple-xl border transition-all duration-300 text-left ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-lg'
                    : 'bg-[#FFFFFF] dark:bg-[#1C1C1E] border-[#E8E8ED] dark:border-[#38383A] hover:border-brand/30 dark:hover:border-brand-light/30 hover:shadow-card'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                  isSelected
                    ? 'bg-white/20'
                    : 'bg-brand/10 text-brand group-hover:bg-brand/20'
                }`}>
                  <CategoryIcon icon={category.icon} />
                </div>
                <h3 className={`font-semibold mb-1 ${isSelected ? 'text-white' : 'text-[#1D1D1F] dark:text-white'}`}>
                  {category.name}
                </h3>
                {category.description && (
                  <p className={`text-xs line-clamp-2 ${isSelected ? 'text-white/80' : 'text-[#86868B] dark:text-[#D2D2D7]'}`}>
                    {category.description}
                  </p>
                )}
                {count > 0 && (
                  <span className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#F5F5F7] dark:bg-[#38383A] text-[#6E6E73] dark:text-[#D2D2D7]'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Active filter indicator */}
        {selectedCategory && (
          <div className="mt-6 flex items-center gap-2">
            <span className="text-sm text-apple-gray-500">Filter aktiv:</span>
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand text-sm font-medium rounded-full hover:bg-brand/20 transition-colors"
            >
              {categories.find(c => c.id === selectedCategory)?.name}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </section>

      {/* Articles Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] dark:text-white tracking-tight">
            {selectedCategory
              ? categories.find(c => c.id === selectedCategory)?.name || 'Artikel'
              : 'Alle Artikel'
            }
          </h2>
          {!loading && filteredArticles.length > 0 && (
            <span className="text-sm text-apple-gray-400 font-medium">
              {filteredArticles.length} {filteredArticles.length === 1 ? 'Artikel' : 'Artikel'}
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-apple-lg p-6 shadow-card animate-pulse-soft">
                <div className="h-5 bg-[#E8E8ED] dark:bg-[#38383A] rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-lg w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-600 px-6 py-4 rounded-apple-lg text-center">
            {error}
          </div>
        )}

        {/* Articles Grid */}
        {!loading && !error && (
          <>
            {filteredArticles.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#86868B] dark:text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-[#6E6E73] dark:text-[#D2D2D7] text-lg">
                  {searchQuery || selectedCategory
                    ? 'Keine Artikel entsprechen deinen Filterkriterien.'
                    : 'Noch keine Artikel vorhanden.'}
                </p>
                {(searchQuery || selectedCategory) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    className="mt-4 text-brand font-medium hover:underline"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article, index) => {
                  const articleCategory = categories.find(c => c.id === article.category);

                  return (
                    <Link
                      key={article.id}
                      href={`/articles/${article.id}`}
                      className="stagger-item block group"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-apple-lg shadow-card dark:shadow-dark-card card-hover h-full p-6 flex flex-col justify-between border border-[#E8E8ED] dark:border-[#38383A] group-hover:shadow-card-hover group-hover:border-[#D2D2D7] dark:group-hover:border-[#38383A]">
                        <div>
                          {articleCategory && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand bg-brand/10 px-2.5 py-1 rounded-full mb-3">
                              <CategoryIcon icon={articleCategory.icon} className="w-3 h-3" />
                              {articleCategory.name}
                            </span>
                          )}
                          <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white mb-2 group-hover:text-brand transition-colors duration-200">
                            {article.title}
                          </h3>
                          <p className="text-sm text-[#86868B] dark:text-[#D2D2D7]">
                            {new Date(article.createdAt).toLocaleDateString('de-DE', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center text-brand text-sm font-medium group-hover:translate-x-1 transition-transform duration-200">
                          <span>Artikel lesen</span>
                          <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
