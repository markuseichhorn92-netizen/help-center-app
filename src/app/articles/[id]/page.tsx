"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FeedbackWidget from '@/components/FeedbackWidget';
import RelatedArticles from '@/components/RelatedArticles';
import ContactCTA from '@/components/ContactCTA';

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

// Mobile TOC Component - Apple-style expandable
function MobileTOC({
  toc,
  activeSection,
  scrollToSection,
  scrollProgress
}: {
  toc: TOCItem[];
  activeSection: string;
  scrollToSection: (id: string) => void;
  scrollProgress: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleItemClick = (id: string) => {
    scrollToSection(id);
    setIsOpen(false);
  };

  if (toc.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 lg:hidden flex items-center gap-2 px-4 py-3 bg-white rounded-full shadow-lg border border-apple-gray-200 transition-all duration-300 ${
          isOpen ? 'scale-95 opacity-90' : 'hover:shadow-xl hover:scale-105'
        }`}
      >
        <div className="relative w-5 h-5">
          <svg
            className={`w-5 h-5 text-apple-gray-600 absolute inset-0 transition-all duration-300 ${isOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <svg
            className={`w-5 h-5 text-apple-gray-600 absolute inset-0 transition-all duration-300 ${isOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <span className="text-sm font-medium text-apple-gray-600">Inhalt</span>
        <div className="w-8 h-8 rounded-full bg-apple-gray-100 flex items-center justify-center">
          <span className="text-xs font-semibold text-brand">{Math.round(scrollProgress)}%</span>
        </div>
      </button>

      {/* Expandable Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 lg:hidden w-[calc(100vw-3rem)] max-w-sm bg-white rounded-2xl shadow-2xl border border-apple-gray-200 overflow-hidden transition-all duration-500 ease-out origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-apple-gray-50 to-white border-b border-apple-gray-100">
          <h3 className="text-sm font-semibold text-apple-gray-600 uppercase tracking-wider flex items-center gap-2">
            <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            Inhaltsverzeichnis
          </h3>
        </div>

        {/* TOC Items */}
        <nav className="max-h-[50vh] overflow-y-auto overscroll-contain">
          <ul className="py-2">
            {toc.map((item, index) => (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-all duration-200 ${
                    item.level === 3 ? 'pl-9' : ''
                  } ${
                    activeSection === item.id
                      ? 'bg-brand/5 border-l-2 border-brand'
                      : 'hover:bg-apple-gray-50 border-l-2 border-transparent'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: isOpen ? 'slideInRight 0.3s ease-out forwards' : 'none'
                  }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    activeSection === item.id ? 'bg-brand' : 'bg-apple-gray-300'
                  }`} />
                  <span className={`text-sm leading-snug ${
                    activeSection === item.id
                      ? 'text-brand font-medium'
                      : 'text-apple-gray-600'
                  }`}>
                    {item.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Progress Bar */}
        <div className="px-5 py-3 bg-apple-gray-50 border-t border-apple-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-apple-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full transition-all duration-300"
                style={{ width: `${scrollProgress}%` }}
              />
            </div>
            <span className="text-xs font-medium text-apple-gray-500 w-8">
              {Math.round(scrollProgress)}%
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

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

  // Scroll progress and active section tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Find active section
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        <div className="max-w-3xl mx-auto py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Artikel wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 text-center animate-fade-in">
        <div className="w-20 h-20 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-apple-gray-600 mb-3">Artikel nicht gefunden</h2>
        <p className="text-lg text-apple-gray-400 mb-8 max-w-md mx-auto">
          Der Artikel, den du suchst, existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-full shadow-apple hover:bg-brand-dark hover:shadow-apple-lg transition-all duration-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-apple-gray-100">
        <div
          className="h-full bg-gradient-to-r from-brand to-brand-dark transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <article className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 animate-fade-in">
        {/* Back Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-apple-gray-400 hover:text-brand transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zur Übersicht
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-10">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-apple-gray-600 tracking-tight leading-tight mb-4">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-apple-gray-400">
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
          </div>
        </header>

        <div className="flex items-start gap-8 lg:gap-10">
          {/* Table of Contents - Desktop (sticky sidebar LEFT) */}
          {toc.length > 0 && (
            <aside className="hidden lg:block w-56 xl:w-64 flex-shrink-0 self-start sticky top-24">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-apple-gray-100 shadow-sm">
                  <h2 className="text-xs font-semibold text-apple-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Inhalt
                  </h2>
                  <nav>
                    <ul className="space-y-0.5">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => scrollToSection(item.id)}
                            className={`text-left w-full text-[13px] py-2 px-3 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                              item.level === 3 ? 'pl-6' : ''
                            } ${
                              activeSection === item.id
                                ? 'bg-brand/10 text-brand font-medium shadow-sm'
                                : 'text-apple-gray-500 hover:bg-apple-gray-50 hover:text-apple-gray-600'
                            }`}
                          >
                            <span className={`w-1 h-1 rounded-full flex-shrink-0 transition-colors ${
                              activeSection === item.id ? 'bg-brand' : 'bg-apple-gray-300'
                            }`} />
                            <span className="leading-snug">{item.text}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Scroll Progress */}
                <div className="mt-4 px-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 bg-apple-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand to-brand-dark rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${scrollProgress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-apple-gray-400 tabular-nums">
                      {Math.round(scrollProgress)}%
                    </span>
                  </div>
                </div>
            </aside>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Article Content */}
            <div
              ref={contentRef}
              className="bg-white rounded-apple-xl shadow-card p-8 md:p-10 border border-apple-gray-100"
            >
              <div
                className="prose prose-lg max-w-none text-apple-gray-500 leading-relaxed
                           prose-headings:text-apple-gray-600 prose-headings:font-semibold prose-headings:tracking-tight
                           prose-headings:scroll-mt-24
                           prose-a:text-brand prose-a:no-underline hover:prose-a:underline
                           prose-strong:text-apple-gray-600
                           prose-ul:list-disc prose-ol:list-decimal
                           prose-li:marker:text-apple-gray-400"
                dangerouslySetInnerHTML={{ __html: processedHtml }}
              />
            </div>

            {/* Feedback Widget */}
            <div className="mt-8">
              <FeedbackWidget articleId={id} />
            </div>

            {/* Related Articles */}
            <RelatedArticles
              currentArticleId={id}
              category={article.category}
            />

            {/* Contact CTA */}
            <div className="mt-8">
              <ContactCTA articleId={id} articleTitle={article.title} />
            </div>

            {/* Bottom Navigation */}
            <div className="mt-10 pt-8 border-t border-apple-gray-200">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-brand font-medium hover:gap-3 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Alle Artikel anzeigen
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile TOC - Floating Apple-style */}
        <MobileTOC
          toc={toc}
          activeSection={activeSection}
          scrollToSection={scrollToSection}
          scrollProgress={scrollProgress}
        />
      </article>
    </>
  );
}
