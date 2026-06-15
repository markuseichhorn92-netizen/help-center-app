"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import FeedbackWidget from '@/components/FeedbackWidget';
import RelatedArticles from '@/components/RelatedArticles';
import { ScrollReveal, MagneticButton } from '@/components/animations';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

// Collapsible TOC Component - Apple-style, above article
function TableOfContents({
  toc,
  activeSection,
  scrollToSection,
}: {
  toc: TOCItem[];
  activeSection: string;
  scrollToSection: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  if (toc.length === 0) return null;

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-apple-gray-100 dark:border-dark-border shadow-sm overflow-hidden">
        {/* Header - Always visible, clickable to toggle */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-apple-gray-50/50 dark:hover:bg-dark-surface-elevated/50 transition-colors duration-200"
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-8 h-8 rounded-lg bg-brand/10 dark:bg-brand-light/20 flex items-center justify-center"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-4 h-4 text-brand dark:text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </motion.div>
            <div className="text-left">
              <h2 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">Inhaltsverzeichnis</h2>
              <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">{toc.length} Abschnitte</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-apple-gray-400 hidden sm:inline">
              {isOpen ? 'Einklappen' : 'Aufklappen'}
            </span>
            <motion.div
              className="w-6 h-6 rounded-full bg-apple-gray-100 dark:bg-dark-surface-elevated flex items-center justify-center"
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <svg className="w-4 h-4 text-apple-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </motion.button>

        {/* Expandable Content */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="border-t border-apple-gray-100 dark:border-dark-border"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <nav className="p-4">
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
                  {toc.map((item, index) => (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <motion.button
                        onClick={() => {
                          scrollToSection(item.id);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left text-sm py-2.5 px-3 rounded-xl transition-all duration-200 flex items-center gap-2 group ${
                          item.level === 3 ? 'pl-6' : ''
                        } ${
                          activeSection === item.id
                            ? 'bg-brand/10 dark:bg-[#0a4958]/30 text-brand dark:text-[#A8D4DE] font-medium'
                            : 'text-[#6E6E73] dark:text-[#A1A1A6] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                        }`}
                        whileHover={{ x: 5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            activeSection === item.id
                              ? 'bg-brand dark:bg-brand-light'
                              : 'bg-apple-gray-300 group-hover:bg-apple-gray-400'
                          }`}
                          animate={{ scale: activeSection === item.id ? 1.3 : 1 }}
                        />
                        <span className="leading-snug truncate">{item.text}</span>
                      </motion.button>
                    </motion.li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Generate slug from text
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => {
      const map: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Extract headings from HTML and add IDs
function processContent(html: string): { processedHtml: string; toc: TOCItem[] } {
  const toc: TOCItem[] = [];
  const usedIds = new Set<string>();

  const processedHtml = html.replace(/<h([23])([^>]*)>([^<]+)<\/h[23]>/gi, (match, level, attrs, text) => {
    let id = generateSlug(text);

    // Ensure unique ID
    let uniqueId = id;
    let counter = 1;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}-${counter}`;
      counter++;
    }
    usedIds.add(uniqueId);

    toc.push({
      id: uniqueId,
      text: text.trim(),
      level: parseInt(level),
    });

    return `<h${level}${attrs} id="${uniqueId}">${text}</h${level}>`;
  });

  return { processedHtml, toc };
}

export default function ArticlePage() {
  const params = useParams();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    if (!id) return;

    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${id}`);
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        setArticle(data);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [id]);

  // Track view (rate-limited via localStorage)
  useEffect(() => {
    if (!id || !article) return;

    // Rate limit: only track once per article per session
    const viewedKey = `viewed_${id}`;
    const lastViewed = localStorage.getItem(viewedKey);
    const now = Date.now();

    // Only track if not viewed in the last 30 minutes
    if (!lastViewed || now - parseInt(lastViewed) > 30 * 60 * 1000) {
      fetch(`/api/articles/${id}/view`, { method: 'POST' }).catch(() => {
        // Silently fail - analytics shouldn't break the page
      });
      localStorage.setItem(viewedKey, now.toString());
    }
  }, [id, article]);

  // Process content and extract TOC
  const { processedHtml, toc } = useMemo(() => {
    if (!article?.content) return { processedHtml: '', toc: [] };
    return processContent(article.content);
  }, [article?.content]);

  // Active section tracking
  useEffect(() => {
    const handleScroll = () => {
      if (toc.length > 0) {
        let currentSection = '';
        for (const item of toc) {
          const element = document.getElementById(item.id);
          if (element) {
            const rect = element.getBoundingClientRect();
            if (rect.top <= 120) {
              currentSection = item.id;
            }
          }
        }
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth',
      });
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          className="py-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <motion.svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </motion.svg>
            <span className="text-lg">Artikel wird geladen...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            className="w-20 h-20 bg-apple-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-6"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <svg className="w-10 h-10 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </motion.div>
          <h2 className="text-3xl font-bold text-apple-gray-600 dark:text-dark-text mb-3">Artikel nicht gefunden</h2>
          <p className="text-lg text-apple-gray-400 dark:text-dark-text-secondary mb-8 max-w-md mx-auto">
            Der Artikel, den du suchst, existiert nicht oder wurde verschoben.
          </p>
          <MagneticButton onClick={() => window.location.href = '/'}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zur Übersicht
          </MagneticButton>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      {/* Reading Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-1 bg-apple-gray-200/50 dark:bg-dark-border/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full bg-gradient-to-r from-brand via-brand-light to-brand origin-left"
          style={{ scaleX }}
        />
      </motion.div>

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Back Link */}
        <ScrollReveal delay={0}>
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-apple-gray-400 hover:text-brand dark:hover:text-brand-light transition-colors duration-200 group"
            >
              <motion.svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                whileHover={{ x: -3 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </motion.svg>
              Zurück zur Übersicht
            </Link>
          </div>
        </ScrollReveal>

        {/* Article Header */}
        <ScrollReveal delay={0.1}>
          <header className="mb-8">
            <motion.h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight leading-tight mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {article.title}
            </motion.h1>
            <motion.div
              className="flex items-center gap-4 text-sm text-[#6E6E73] dark:text-[#98989D]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <time dateTime={article.createdAt}>
                {new Date(article.createdAt).toLocaleDateString('de-DE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </time>
              {article.updatedAt !== article.createdAt && (
                <>
                  <span className="w-1 h-1 rounded-full bg-apple-gray-300"></span>
                  <span>
                    Aktualisiert am {new Date(article.updatedAt).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </>
              )}
            </motion.div>
          </header>
        </ScrollReveal>

        {/* Table of Contents - Above Article */}
        <TableOfContents
          toc={toc}
          activeSection={activeSection}
          scrollToSection={scrollToSection}
        />

        {/* Article Content */}
        <ScrollReveal delay={0.4}>
          <motion.div
            ref={contentRef}
            className="bg-white dark:bg-dark-surface rounded-2xl shadow-card dark:shadow-dark-card p-6 sm:p-8 md:p-10 border border-apple-gray-100 dark:border-dark-border"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div
              className="prose prose-lg max-w-prose text-[#6E6E73] dark:text-[#A1A1A6] leading-relaxed
                         prose-headings:text-[#1D1D1F] dark:prose-headings:text-[#F5F5F7] prose-headings:font-semibold prose-headings:tracking-tight
                         prose-headings:scroll-mt-24
                         prose-a:text-brand dark:prose-a:text-[#A8D4DE] prose-a:no-underline hover:prose-a:underline
                         prose-strong:text-[#1D1D1F] dark:prose-strong:text-[#F5F5F7]
                         prose-ul:list-disc prose-ol:list-decimal
                         prose-li:marker:text-[#86868B] dark:prose-li:marker:text-[#6E6E73]
                         prose-code:text-brand dark:prose-code:text-[#A8D4DE] prose-code:bg-[#F5F5F7] dark:prose-code:bg-[#2C2C2E]"
              dangerouslySetInnerHTML={{ __html: processedHtml }}
            />
          </motion.div>
        </ScrollReveal>

        {/* Feedback Widget */}
        <ScrollReveal delay={0.5}>
          <div className="mt-8">
            <FeedbackWidget articleId={id} />
          </div>
        </ScrollReveal>

        {/* Related Articles */}
        <ScrollReveal delay={0.6}>
          <RelatedArticles
            currentArticleId={id}
            category={article.category}
          />
        </ScrollReveal>

        {/* Bottom Navigation */}
        <ScrollReveal delay={0.8}>
          <div className="mt-10 pt-8 border-t border-apple-gray-200 dark:border-dark-border">
            <motion.div whileHover={{ x: -5 }}>
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-brand dark:text-brand-light font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Alle Artikel anzeigen
              </Link>
            </motion.div>
          </div>
        </ScrollReveal>
      </article>
    </>
  );
}
