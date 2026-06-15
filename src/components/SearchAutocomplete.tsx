"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  title: string;
  category?: string;
  excerpt: string;
  matchType: 'title' | 'content';
}

interface SearchAutocompleteProps {
  placeholder?: string;
  className?: string;
  onSearch?: (query: string) => void;
}

export default function SearchAutocomplete({
  placeholder = 'Suche nach Artikeln...',
  className = '',
  onSearch,
}: SearchAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Debounced search
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 200);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          navigateToArticle(results[selectedIndex].id);
        } else if (query && onSearch) {
          onSearch(query);
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const navigateToArticle = (articleId: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/articles/${articleId}`);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-5 py-3.5 pl-12 text-lg bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] border border-[#E8E8ED] dark:border-[#38383A] rounded-full shadow-apple dark:shadow-dark-card focus:outline-none focus:ring-2 focus:ring-brand/30 dark:focus:ring-brand-light/30 focus:border-brand dark:focus:border-brand-light transition-all duration-200 placeholder:text-[#86868B] dark:placeholder:text-[#6E6E73]"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {loading ? (
            <svg className="w-5 h-5 text-apple-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Suche löschen"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-apple-gray-400 hover:text-apple-gray-600 dark:hover:text-apple-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-lg dark:shadow-dark-card border border-[#E8E8ED] dark:border-[#38383A] overflow-hidden z-50 animate-fade-in">
          <ul className="divide-y divide-[#E8E8ED] dark:divide-[#38383A]">
            {results.map((result, index) => (
              <li key={result.id}>
                <button
                  onClick={() => navigateToArticle(result.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    selectedIndex === index ? 'bg-brand/5 dark:bg-brand-light/10' : 'hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {result.matchType === 'title' ? (
                        <svg className="w-4 h-4 text-brand dark:text-brand-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-[#86868B] dark:text-[#6E6E73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate [&>mark]:bg-yellow-200 dark:[&>mark]:bg-yellow-500/30 [&>mark]:px-0.5 [&>mark]:rounded"
                        dangerouslySetInnerHTML={{ __html: result.title }}
                      />
                      <p
                        className="text-sm text-[#6E6E73] dark:text-[#98989D] line-clamp-2 [&>mark]:bg-yellow-100 dark:[&>mark]:bg-yellow-500/20 [&>mark]:px-0.5 [&>mark]:rounded"
                        dangerouslySetInnerHTML={{ __html: result.excerpt }}
                      />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 bg-[#F5F5F7] dark:bg-[#2C2C2E] border-t border-[#E8E8ED] dark:border-[#38383A]">
            <p className="text-xs text-[#86868B] dark:text-[#6E6E73]">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1C1C1E] border border-[#E8E8ED] dark:border-[#38383A] rounded text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">↑↓</kbd>
              {' '}zum Navigieren,{' '}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1C1C1E] border border-[#E8E8ED] dark:border-[#38383A] rounded text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Enter</kbd>
              {' '}zum Auswählen,{' '}
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-[#1C1C1E] border border-[#E8E8ED] dark:border-[#38383A] rounded text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">Esc</kbd>
              {' '}zum Schließen
            </p>
          </div>
        </div>
      )}

      {/* No results */}
      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-lg dark:shadow-dark-card border border-[#E8E8ED] dark:border-[#38383A] p-4 text-center z-50">
          <p className="text-[#6E6E73] dark:text-[#98989D]">Keine Ergebnisse für &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
