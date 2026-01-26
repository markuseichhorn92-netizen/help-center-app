"use client";

import Link from 'next/link';

interface ContactCTAProps {
  articleId: string;
  articleTitle: string;
}

export default function ContactCTA({ articleId, articleTitle }: ContactCTAProps) {
  // Encode article info for the support page
  const supportUrl = `/support?ref=article&article_id=${encodeURIComponent(articleId)}&article_title=${encodeURIComponent(articleTitle)}`;

  return (
    <div className="bg-gradient-to-br from-brand/5 to-brand/10 rounded-apple-xl p-6 border border-brand/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-apple-gray-600 mb-1">
              Frage nicht beantwortet?
            </h3>
            <p className="text-sm text-apple-gray-500">
              Unser Support-Team hilft dir gerne weiter.
            </p>
          </div>
        </div>
        <Link
          href={supportUrl}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-full shadow-apple hover:bg-brand-dark hover:shadow-apple-lg transition-all duration-300 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Kontakt aufnehmen
        </Link>
      </div>
    </div>
  );
}
