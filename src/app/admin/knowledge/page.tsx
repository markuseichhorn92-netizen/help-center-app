"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface KnowledgeEntry {
  id: string;
  url: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string[];
  lastCrawled: string;
  createdAt: string;
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crawlMode, setCrawlMode] = useState<'urls' | 'sitemap' | 'website'>('urls');
  const [urlInput, setUrlInput] = useState('https://fit-inn-trier.de\nhttps://fit-inn-trier.de/ueber-uns\nhttps://fit-inn-trier.de/kurse');
  const [sitemapUrl, setSitemapUrl] = useState('https://fit-inn-trier.de/sitemap.xml');
  const [startUrl, setStartUrl] = useState('https://fit-inn-trier.de');
  const [maxPages, setMaxPages] = useState(100);
  const [skipExisting, setSkipExisting] = useState(true);
  const [crawlResult, setCrawlResult] = useState<any>(null);

  const loadEntries = async () => {
    try {
      const res = await fetch('/api/admin/crawl', {
        credentials: 'same-origin',
      });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error('Failed to load entries');
      }

      const data = await res.json();
      setEntries(data.entries);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleCrawl = async () => {
    setCrawling(true);
    setCrawlResult(null);
    setError(null);

    try {
      let body: any = { action: '' };

      switch (crawlMode) {
        case 'urls':
          body.action = 'crawl_urls';
          body.urls = urlInput.split('\n').map(u => u.trim()).filter(u => u);
          body.skipExisting = skipExisting;
          break;
        case 'sitemap':
          body.action = 'crawl_sitemap';
          body.sitemapUrl = sitemapUrl;
          body.skipExisting = skipExisting;
          break;
        case 'website':
          body.action = 'crawl_website';
          body.startUrl = startUrl;
          body.maxPages = maxPages;
          body.skipExisting = skipExisting;
          break;
      }

      const res = await fetch('/api/admin/crawl', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Crawl failed');

      setCrawlResult(data);
      await loadEntries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCrawling(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/admin/crawl?id=${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!res.ok) throw new Error('Delete failed');

      await loadEntries();
    } catch (err: any) {
      alert(err.message);
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
            <span className="text-lg">Wird geladen...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600 tracking-tight">Knowledge Base</h1>
          <p className="text-apple-gray-400 text-sm mt-1">Website-Inhalte für KI-gestützte Antworten</p>
        </div>
      </div>

      {/* Crawl Section */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 p-6 mb-8">
        <h2 className="text-xl font-bold text-apple-gray-600 mb-4">Website crawlen</h2>
        
        {/* Crawl Mode Selection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setCrawlMode('urls')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              crawlMode === 'urls' ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200'
            }`}
          >
            URL-Liste
          </button>
          <button
            onClick={() => setCrawlMode('sitemap')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              crawlMode === 'sitemap' ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200'
            }`}
          >
            Sitemap
          </button>
          <button
            onClick={() => setCrawlMode('website')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              crawlMode === 'website' ? 'bg-brand text-white' : 'bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200'
            }`}
          >
            Ganze Website
          </button>
        </div>

        {/* URL List Mode */}
        {crawlMode === 'urls' && (
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              URLs (eine pro Zeile)
            </label>
            <textarea
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              rows={5}
              className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="https://example.com/page1&#10;https://example.com/page2"
            />
          </div>
        )}

        {/* Sitemap Mode */}
        {crawlMode === 'sitemap' && (
          <div>
            <label className="block text-sm font-medium text-apple-gray-600 mb-2">
              Sitemap URL
            </label>
            <input
              type="url"
              value={sitemapUrl}
              onChange={(e) => setSitemapUrl(e.target.value)}
              className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
              placeholder="https://example.com/sitemap.xml"
            />
          </div>
        )}

        {/* Website Crawl Mode */}
        {crawlMode === 'website' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-apple-gray-600 mb-2">
                Start-URL
              </label>
              <input
                type="url"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                className="w-full px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-apple-gray-600 mb-2">
                Max. Seiten
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={maxPages}
                  onChange={(e) => setMaxPages(Math.min(1000, Math.max(1, Number(e.target.value))))}
                  className="w-24 px-4 py-2 border border-apple-gray-200 rounded-apple-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={Math.min(500, maxPages)}
                  onChange={(e) => setMaxPages(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-apple-gray-400 mt-1">Max. 1000 Seiten möglich</p>
            </div>
          </div>
        )}

        {/* Skip Existing Option */}
        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="skipExisting"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
            className="w-4 h-4 text-brand border-apple-gray-300 rounded focus:ring-brand"
          />
          <label htmlFor="skipExisting" className="text-sm text-apple-gray-600">
            Bereits gecrawlte URLs überspringen (nicht erneut crawlen)
          </label>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleCrawl}
            disabled={crawling}
            className="px-6 py-2 bg-brand text-white font-medium rounded-full hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {crawling ? (
              <>
                <svg className="w-4 h-4 animate-spin inline-block mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Crawling...
              </>
            ) : (
              'Jetzt crawlen'
            )}
          </button>
          
          <p className="text-sm text-apple-gray-400">
            Automatisches Crawling alle 6 Stunden (via Cron Job)
          </p>
        </div>

        {/* Crawl Result */}
        {crawlResult && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-apple-lg">
            <p className="text-sm font-medium text-green-700">
              ✓ Crawl abgeschlossen: {crawlResult.results.total} Seiten gefunden
            </p>
            <p className="text-xs text-green-600 mt-1">
              {crawlResult.results.newOrUpdated || crawlResult.results.success} neu/aktualisiert
              {crawlResult.results.skipped > 0 && `, ${crawlResult.results.skipped} übersprungen`}
              {crawlResult.results.errors > 0 && `, ${crawlResult.results.errors} Fehler`}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-apple-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Entries List */}
      <div className="bg-white rounded-apple-xl shadow-card border border-apple-gray-100 overflow-hidden">
        <div className="p-6 border-b border-apple-gray-100">
          <h2 className="text-xl font-bold text-apple-gray-600">
            Gecrawlte Inhalte ({entries.length})
          </h2>
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-apple-gray-500">Noch keine Inhalte gecrawlt</p>
            <p className="text-sm text-apple-gray-400 mt-2">Starte den ersten Crawl oben</p>
          </div>
        ) : (
          <div className="divide-y divide-apple-gray-100">
            {entries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-apple-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <Link
                    href={`/admin/knowledge/${entry.id}`}
                    className="flex-1 min-w-0 cursor-pointer"
                  >
                    <h3 className="text-lg font-medium text-apple-gray-600 mb-1 hover:text-brand transition-colors">
                      {entry.title}
                    </h3>
                    <span className="text-sm text-brand hover:underline block mb-2">
                      {entry.url}
                    </span>
                    {entry.description && (
                      <p className="text-sm text-apple-gray-500 mb-2">{entry.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-apple-gray-400">
                      <span>Gecrawlt: {new Date(entry.lastCrawled).toLocaleDateString('de-DE')}</span>
                      <span>{entry.content.length.toLocaleString()} Zeichen</span>
                      {entry.keywords && entry.keywords.length > 0 && (
                        <span>{entry.keywords.length} Keywords</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/knowledge/${entry.id}`}
                      className="text-apple-gray-400 hover:text-brand transition-colors"
                      title="Bearbeiten"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Link>
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-apple-gray-400 hover:text-brand transition-colors"
                      title="Original-Seite öffnen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-apple-gray-400 hover:text-red-500 transition-colors"
                      title="Löschen"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
