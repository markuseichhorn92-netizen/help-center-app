"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Article {
  id: string;
  title: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

async function fetchArticles(): Promise<Article[]> {
  const res = await fetch('/api/admin/articles', {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = '/admin/login';
      throw new Error('Session abgelaufen');
    }
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to fetch articles for admin');
  }

  return res.json();
}

export default function AdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArticles = async () => {
      try {
        const fetchedArticles = await fetchArticles();
        setArticles(fetchedArticles);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadArticles();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Bist du sicher, dass du diesen Artikel löschen möchtest?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/articles/${id}`, {
        method: "DELETE",
        credentials: 'same-origin',
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to delete article");
      }

      setArticles(articles.filter(article => article.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-3 text-apple-gray-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-lg">Artikel werden geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-apple-lg" role="alert">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Fehler: {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Artikel</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Verwalte deine Hilfe-Center Artikel</p>
        </div>
      </div>

      {/* Articles Table/Cards */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
        {articles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-apple-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-apple-gray-500 text-lg mb-2">Keine Artikel vorhanden</p>
            <p className="text-apple-gray-400 text-sm">Erstelle deinen ersten Artikel!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-apple-gray-50 border-b border-apple-gray-100">
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Artikel
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-apple-gray-400 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-apple-gray-100">
                {articles.map((article, index) => (
                  <tr
                    key={article.id}
                    className="hover:bg-apple-gray-50 transition-colors duration-150 stagger-item"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-apple-gray-600">
                          {article.title}
                        </span>
                        <span className="text-sm text-apple-gray-400 mt-0.5">
                          Aktualisiert: {new Date(article.updatedAt).toLocaleDateString('de-DE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${
                        article.published
                          ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20'
                          : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                      }`}>
                        {article.published ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/edit/${article.id}`}
                          className="text-sm font-medium text-apple-gray-500 hover:text-brand transition-colors duration-200"
                        >
                          Bearbeiten
                        </Link>
                        <button
                          onClick={() => handleDelete(article.id)}
                          className="text-sm font-medium text-apple-gray-400 hover:text-red-500 transition-colors duration-200"
                        >
                          Löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {articles.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-apple-gray-400">
          <span>{articles.length} {articles.length === 1 ? 'Artikel' : 'Artikel'} insgesamt</span>
          <span>{articles.filter(a => a.published).length} veröffentlicht</span>
        </div>
      )}
    </div>
  );
}

