"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { motion, AnimatePresence } from 'framer-motion';
import {
  ParticleBackground,
  GradientOrbs,
  TextReveal,
  GlowCard,
  ScrollReveal,
  StaggerContainer,
  StaggerItem,
} from '@/components/animations';
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
    <div className="overflow-hidden">
      {/* Hero Section - Full Width with Particles */}
      <section className="relative w-full py-16 md:py-20 flex items-center justify-center overflow-hidden">
        {/* Particle Background */}
        <div className="absolute inset-0">
          <ParticleBackground
            particleCount={60}
            colors={['#0a4958', '#cfe5ea', '#ffb54f']}
            connectDistance={100}
            mouseRadius={120}
          />
        </div>

        {/* Gradient Orbs */}
        <GradientOrbs count={3} />

        {/* Hero Gradient Overlay */}
        <div className="absolute inset-0 bg-hero-gradient opacity-90 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 text-center py-12 md:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Animated Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const }}
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight leading-tight">
                <TextReveal variant="flip" delay={0.2}>
                  Wie können wir
                </TextReveal>
                <br />
                <TextReveal variant="flip" delay={0.5}>
                  dir helfen?
                </TextReveal>
              </h1>
            </motion.div>

            <motion.p
              className="mt-6 text-lg text-[#6E6E73] dark:text-[#A1A1A6] max-w-lg mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Finde Antworten auf deine Fragen im FIT INN Hilfe-Center.
            </motion.p>

            {/* Search Input with Glow */}
            <motion.div
              className="mt-10 max-w-xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
            >
              <div className="relative group">
                {/* Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-brand via-brand-light to-accent rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                <div className="relative">
                  <SearchAutocomplete
                    placeholder="Suche nach Artikeln..."
                    onSearch={(query) => setSearchQuery(query)}
                  />
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </section>

      {/* Categories Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12">
        <ScrollReveal>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight mb-8">
            Themen durchsuchen
          </h2>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4" staggerDelay={0.1}>
          {categories.map((category, index) => {
            const count = getCategoryArticleCount(category.id);
            const isSelected = selectedCategory === category.id;

            return (
              <StaggerItem key={category.id}>
                <GlowCard
                  onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                  isSelected={isSelected}
                  delay={index * 0.05}
                  glowColor={isSelected ? 'rgba(10, 73, 88, 0.6)' : 'rgba(10, 73, 88, 0.3)'}
                >
                  <div className="p-5 text-left">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-colors ${
                      isSelected
                        ? 'bg-white/20'
                        : 'bg-brand/10 text-brand group-hover:bg-brand/20'
                    }`}>
                      <CategoryIcon icon={category.icon} />
                    </div>
                    <h3 className={`font-semibold mb-1 ${isSelected ? 'text-white' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'}`}>
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className={`text-xs line-clamp-2 ${isSelected ? 'text-white/80' : 'text-[#6E6E73] dark:text-[#A1A1A6]'}`}>
                        {category.description}
                      </p>
                    )}
                    {count > 0 && (
                      <motion.span
                        className={`absolute top-3 right-3 text-xs font-medium px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[#F5F5F7] dark:bg-[#38383A] text-[#6E6E73] dark:text-[#D2D2D7]'
                        }`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, delay: index * 0.05 + 0.2 }}
                      >
                        {count}
                      </motion.span>
                    )}
                  </div>
                </GlowCard>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {/* Active filter indicator */}
        <AnimatePresence>
          {selectedCategory && (
            <motion.div
              className="mt-6 flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="text-sm text-apple-gray-500">Filter aktiv:</span>
              <motion.button
                onClick={() => setSelectedCategory(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand text-sm font-medium rounded-full hover:bg-brand/20 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {categories.find(c => c.id === selectedCategory)?.name}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Articles Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 md:pb-16">
        <ScrollReveal>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {selectedCategory
                ? categories.find(c => c.id === selectedCategory)?.name || 'Artikel'
                : 'Alle Artikel'
              }
            </h2>
            {!loading && filteredArticles.length > 0 && (
              <motion.span
                className="text-sm text-apple-gray-400 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {filteredArticles.length} {filteredArticles.length === 1 ? 'Artikel' : 'Artikel'}
              </motion.span>
            )}
          </div>
        </ScrollReveal>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="bg-[#FFFFFF] dark:bg-[#1C1C1E] rounded-2xl p-6 shadow-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              >
                <div className="h-5 bg-[#E8E8ED] dark:bg-[#38383A] rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-[#F5F5F7] dark:bg-[#2C2C2E] rounded-lg w-1/2"></div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <motion.div
            className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {error}
          </motion.div>
        )}

        {/* Articles Grid */}
        {!loading && !error && (
          <>
            {filteredArticles.length === 0 ? (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <motion.div
                  className="w-16 h-16 bg-[#F5F5F7] dark:bg-[#1C1C1E] rounded-full flex items-center justify-center mx-auto mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <svg className="w-8 h-8 text-[#86868B] dark:text-[#D2D2D7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </motion.div>
                <p className="text-[#6E6E73] dark:text-[#A1A1A6] text-lg">
                  {searchQuery || selectedCategory
                    ? 'Keine Artikel entsprechen deinen Filterkriterien.'
                    : 'Noch keine Artikel vorhanden.'}
                </p>
                {(searchQuery || selectedCategory) && (
                  <motion.button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory(null);
                    }}
                    className="mt-4 text-brand font-medium hover:underline"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Filter zurücksetzen
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" staggerDelay={0.08}>
                {filteredArticles.map((article, index) => {
                  const articleCategory = categories.find(c => c.id === article.category);

                  return (
                    <StaggerItem key={article.id}>
                      <Link href={`/articles/${article.id}`} className="block group h-full">
                        <motion.div
                          className="bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-card dark:shadow-dark-card h-full p-6 flex flex-col justify-between border border-[#E8E8ED] dark:border-[#38383A] group-hover:shadow-xl dark:group-hover:shadow-dark-card-hover group-hover:border-brand/20 dark:group-hover:border-brand-light/30 transition-all duration-300"
                          whileHover={{ y: -8, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div>
                            {articleCategory && (
                              <motion.span
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand dark:text-[#A8D4DE] bg-brand/10 dark:bg-[#0a4958]/30 px-2.5 py-1 rounded-full mb-3"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.05 + 0.3 }}
                              >
                                <CategoryIcon icon={articleCategory.icon} className="w-3 h-3" />
                                {articleCategory.name}
                              </motion.span>
                            )}
                            <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] mb-2 group-hover:text-brand dark:group-hover:text-[#A8D4DE] transition-colors duration-200">
                              {article.title}
                            </h3>
                            <p className="text-sm text-[#6E6E73] dark:text-[#98989D]">
                              {new Date(article.createdAt).toLocaleDateString('de-DE', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <motion.div
                            className="mt-4 flex items-center text-brand dark:text-[#A8D4DE] text-sm font-medium"
                            whileHover={{ x: 5 }}
                          >
                            <span>Artikel lesen</span>
                            <motion.svg
                              className="ml-2 w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              animate={{ x: [0, 3, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </motion.svg>
                          </motion.div>
                        </motion.div>
                      </Link>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            )}
          </>
        )}
      </section>
    </div>
  );
}
