"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

async function getArticles(): Promise<Article[]> {
  const res = await fetch('/api/articles', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch articles');
  }
  return res.json();
}

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const fetchedArticles = await getArticles();
        setArticles(fetchedArticles);
        setFilteredArticles(fetchedArticles);
      } catch (err) {
        setError('Artikel konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    loadArticles();
  }, []);

  useEffect(() => {
    const filtered = articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredArticles(filtered);
  }, [searchQuery, articles]);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="text-center py-16 md:py-24 -mt-8 md:-mt-12 -mx-6 lg:-mx-8 px-6 lg:px-8 bg-hero-gradient rounded-b-[40px]">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-apple-gray-600 tracking-tight leading-tight">
            Wie können wir
            <br />
            dir helfen?
          </h1>
          <p className="mt-6 text-lg text-apple-gray-500 max-w-lg mx-auto">
            Finde Antworten auf deine Fragen im FIT INN Hilfe-Center.
          </p>

          {/* Search Input */}
          <div className="mt-10 max-w-xl mx-auto relative">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Suche nach Artikeln..."
              className="w-full pl-14 pr-6 py-4 text-base bg-white border-0 rounded-2xl shadow-apple-lg transition-all duration-300 placeholder:text-apple-gray-400 focus:outline-none focus:ring-4 focus:ring-brand/20 focus:shadow-apple-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Articles Section */}
      <section className="py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-apple-gray-600 tracking-tight">
            Alle Artikel
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
              <div key={i} className="bg-white rounded-apple-lg p-6 shadow-card animate-pulse-soft">
                <div className="h-5 bg-apple-gray-200 rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-apple-gray-100 rounded-lg w-1/2"></div>
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
                <div className="w-16 h-16 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-apple-gray-500 text-lg">
                  {searchQuery ? 'Keine Artikel entsprechen deiner Suche.' : 'Noch keine Artikel vorhanden.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article, index) => (
                  <Link
                    key={article.id}
                    href={`/articles/${article.id}`}
                    className="stagger-item block group"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="bg-white rounded-apple-lg shadow-card card-hover h-full p-6 flex flex-col justify-between border border-apple-gray-100 group-hover:shadow-card-hover group-hover:border-apple-gray-200">
                      <div>
                        <h3 className="text-lg font-semibold text-apple-gray-600 mb-2 group-hover:text-brand transition-colors duration-200">
                          {article.title}
                        </h3>
                        <p className="text-sm text-apple-gray-400">
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
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
