"use client";

import { useState, useEffect } from 'react';

interface FeedbackWidgetProps {
  articleId: string;
}

interface FeedbackState {
  helpful: number;
  notHelpful: number;
  helpfulPercent: number;
  hasVoted: boolean;
}

// Generate a simple visitor hash from browser info
function generateClientHash(): string {
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');

  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export default function FeedbackWidget({ articleId }: FeedbackWidgetProps) {
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showThanks, setShowThanks] = useState(false);
  const [visitorHash, setVisitorHash] = useState<string>('');

  useEffect(() => {
    // Generate visitor hash on client side
    const hash = generateClientHash();
    setVisitorHash(hash);

    // Check localStorage for previous vote
    const storedVote = localStorage.getItem(`feedback_${articleId}`);
    if (storedVote) {
      setVoted(storedVote as 'helpful' | 'not_helpful');
    }

    // Fetch current feedback
    const fetchFeedback = async () => {
      try {
        const res = await fetch(`/api/articles/${articleId}/feedback`, {
          headers: {
            'x-visitor-hash': hash,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setFeedback(data);
          if (data.hasVoted) {
            // If server says we voted but localStorage doesn't have it, we may have cleared cache
            // Just show the result without a specific selection
            setVoted(storedVote as 'helpful' | 'not_helpful' || 'helpful');
          }
        }
      } catch (err) {
        console.error('Failed to fetch feedback:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [articleId]);

  const submitVote = async (helpful: boolean) => {
    if (voted || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          helpful,
          visitorHash,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({
          helpful: data.helpful,
          notHelpful: data.notHelpful,
          helpfulPercent: data.helpfulPercent,
          hasVoted: true,
        });
        const voteType = helpful ? 'helpful' : 'not_helpful';
        setVoted(voteType);
        localStorage.setItem(`feedback_${articleId}`, voteType);
        setShowThanks(true);
        setTimeout(() => setShowThanks(false), 3000);
      } else if (res.status === 409) {
        // Already voted
        setVoted(helpful ? 'helpful' : 'not_helpful');
      }
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-apple-gray-50 rounded-apple-xl p-6 text-center">
        <div className="animate-pulse">
          <div className="h-5 bg-apple-gray-200 rounded w-48 mx-auto mb-4"></div>
          <div className="flex justify-center gap-3">
            <div className="h-10 bg-apple-gray-200 rounded-full w-32"></div>
            <div className="h-10 bg-apple-gray-200 rounded-full w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-apple-gray-50 rounded-apple-xl p-6 border border-apple-gray-100">
      {showThanks ? (
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-medium text-apple-gray-600">Danke für dein Feedback!</p>
          <p className="text-sm text-apple-gray-400 mt-1">
            Deine Meinung hilft uns, unsere Artikel zu verbessern.
          </p>
        </div>
      ) : voted ? (
        <div className="text-center">
          <p className="text-sm font-medium text-apple-gray-600 mb-4">
            Du hast diesen Artikel als {voted === 'helpful' ? 'hilfreich' : 'nicht hilfreich'} bewertet.
          </p>
          {feedback && feedback.helpful + feedback.notHelpful > 0 && (
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">👍</span>
                </div>
                <span className="text-sm text-apple-gray-600">{feedback.helpful}</span>
              </div>
              <div className="w-32 h-2 bg-apple-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${feedback.helpfulPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-apple-gray-600">{feedback.notHelpful}</span>
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-sm">👎</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg font-medium text-apple-gray-600 mb-4">
            War dieser Artikel hilfreich?
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => submitVote(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-apple-gray-600 font-medium rounded-full border border-apple-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all duration-200 disabled:opacity-50"
            >
              <span className="text-lg">👍</span>
              Ja, danke!
            </button>
            <button
              onClick={() => submitVote(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-apple-gray-600 font-medium rounded-full border border-apple-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all duration-200 disabled:opacity-50"
            >
              <span className="text-lg">👎</span>
              Nicht wirklich
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
