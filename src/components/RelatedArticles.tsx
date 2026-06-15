"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Article {
  id: string;
  title: string;
  category?: string;
}

interface RelatedArticlesProps {
  currentArticleId: string;
  category?: string;
  maxArticles?: number;
}

export default function RelatedArticles({
  currentArticleId,
  category,
  maxArticles = 3,
}: RelatedArticlesProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await fetch('/api/articles');
        if (!res.ok) return;

        const allArticles: Article[] = await res.json();

        // Filter by category if available, otherwise get random articles
        let related = allArticles.filter((a) => a.id !== currentArticleId);

        if (category) {
          const sameCategory = related.filter((a) => a.category === category);
          const otherCategory = related.filter((a) => a.category !== category);

          // Prioritize same category, then fill with others
          related = [...sameCategory, ...otherCategory];
        }

        // Limit to maxArticles
        setArticles(related.slice(0, maxArticles));
      } catch (err) {
        console.error('Failed to fetch related articles:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelated();
  }, [currentArticleId, category, maxArticles]);

  if (loading) {
    return (
      <div className="mt-8">
        <div className="animate-pulse">
          <div className="h-6 bg-apple-gray-200 dark:bg-[#38383A] rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-apple-gray-100 dark:bg-[#1C1C1E] rounded-apple-lg"></div>
            <div className="h-16 bg-apple-gray-100 dark:bg-[#1C1C1E] rounded-apple-lg"></div>
            <div className="h-16 bg-apple-gray-100 dark:bg-[#1C1C1E] rounded-apple-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-apple-gray-600 dark:text-dark-text mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-apple-gray-400 dark:text-apple-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Das könnte dich auch interessieren
      </h3>
      <div className="space-y-3">
        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/articles/${article.id}`}
            className="block bg-white dark:bg-[#1C1C1E] border border-apple-gray-100 dark:border-[#38383A] rounded-apple-lg p-4 hover:border-brand/30 hover:bg-brand/5 dark:hover:border-brand-light/30 dark:hover:bg-brand/10 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-apple-gray-600 dark:text-dark-text group-hover:text-brand dark:group-hover:text-brand-light transition-colors font-medium">
                {article.title}
              </span>
              <svg
                className="w-4 h-4 text-apple-gray-400 dark:text-apple-gray-300 group-hover:text-brand dark:group-hover:text-brand-light group-hover:translate-x-1 transition-all"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
