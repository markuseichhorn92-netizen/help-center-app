"use client";

import { useState, useEffect } from 'react';
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

export default function ArticlePage() {
  const params = useParams();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-fade-in">
        <div className="py-12 text-center">
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
      <div className="max-w-3xl mx-auto text-center py-20 animate-fade-in">
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
    <article className="max-w-3xl mx-auto animate-fade-in">
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

      {/* Article Content */}
      <div className="bg-white rounded-apple-xl shadow-card p-8 md:p-10 border border-apple-gray-100">
        <div
          className="prose prose-lg max-w-none text-apple-gray-500 leading-relaxed
                     prose-headings:text-apple-gray-600 prose-headings:font-semibold prose-headings:tracking-tight
                     prose-a:text-brand prose-a:no-underline hover:prose-a:underline
                     prose-strong:text-apple-gray-600
                     prose-ul:list-disc prose-ol:list-decimal
                     prose-li:marker:text-apple-gray-400"
          dangerouslySetInnerHTML={{ __html: article.content }}
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
    </article>
  );
}
