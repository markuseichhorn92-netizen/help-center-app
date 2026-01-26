"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TOCItem {
  id: string;
  text: string;
  level: number;
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

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Table of Contents - Mobile (inline) */}
            {toc.length > 0 && (
              <div className="lg:hidden mb-8 bg-apple-gray-50 rounded-apple-xl p-6 border border-apple-gray-100">
                <h2 className="text-sm font-semibold text-apple-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Inhalt
                </h2>
                <nav>
                  <ul className="space-y-2">
                    {toc.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => scrollToSection(item.id)}
                          className={`text-left w-full text-sm transition-colors hover:text-brand ${
                            item.level === 3 ? 'pl-4' : ''
                          } ${
                            activeSection === item.id
                              ? 'text-brand font-medium'
                              : 'text-apple-gray-500'
                          }`}
                        >
                          {item.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            )}

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

          {/* Table of Contents - Desktop (sticky sidebar) */}
          {toc.length > 0 && (
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-20">
                <div className="bg-apple-gray-50 rounded-apple-xl p-5 border border-apple-gray-100">
                  <h2 className="text-xs font-semibold text-apple-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    Inhalt
                  </h2>
                  <nav>
                    <ul className="space-y-1">
                      {toc.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => scrollToSection(item.id)}
                            className={`text-left w-full text-sm py-1.5 px-2 rounded-lg transition-all ${
                              item.level === 3 ? 'pl-5' : ''
                            } ${
                              activeSection === item.id
                                ? 'bg-brand/10 text-brand font-medium'
                                : 'text-apple-gray-500 hover:bg-apple-gray-100 hover:text-apple-gray-600'
                            }`}
                          >
                            {item.text}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </nav>
                </div>

                {/* Scroll Progress Circle */}
                <div className="mt-4 flex items-center justify-center">
                  <div className="relative w-12 h-12">
                    <svg className="w-12 h-12 transform -rotate-90">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-apple-gray-200"
                      />
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-brand transition-all duration-150"
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - scrollProgress / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-apple-gray-600">
                      {Math.round(scrollProgress)}%
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </article>
    </>
  );
}
