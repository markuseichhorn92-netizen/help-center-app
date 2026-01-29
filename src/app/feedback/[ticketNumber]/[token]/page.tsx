'use client';

import { useState, useEffect } from 'react';

interface TicketInfo {
  ticketNumber: string;
  subject: string;
  customerName: string;
}

export default function TicketRatingPage({
  params,
}: {
  params: Promise<{ ticketNumber: string; token: string }>;
}) {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketInfo, setTicketInfo] = useState<TicketInfo | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Get token from params
  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  // Validate token and load ticket info
  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      try {
        const res = await fetch(`/api/feedback/ticket/${token}`);
        const data = await res.json();

        if (!data.valid) {
          setError(data.error || 'Ungültiger Link');
        } else {
          setTicketInfo({
            ticketNumber: data.ticketNumber,
            subject: data.subject,
            customerName: data.customerName,
          });
        }
      } catch {
        setError('Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/feedback/ticket/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Fehler beim Speichern');
      } else {
        setSubmitted(true);
      }
    } catch {
      setError('Fehler beim Speichern');
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0a4958] border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Wird geladen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !ticketInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Zugriff nicht möglich</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Vielen Dank!</h1>
          <p className="text-gray-600 mb-6">
            Ihre Bewertung hilft uns, unseren Service zu verbessern.
          </p>
          <div className="flex justify-center gap-1 text-4xl mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}
              >
                ★
              </span>
            ))}
          </div>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-[#0a4958] text-white rounded-xl font-medium hover:bg-[#073440] transition-colors"
          >
            Zum Hilfe-Center
          </a>
        </div>
      </div>
    );
  }

  // Rating form
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#0a4958] rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Wie war unser Support?
          </h1>
          <p className="text-gray-600">
            Ihre Meinung ist uns wichtig
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Ticket Info */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100">
            <div className="text-sm text-gray-500">Ticket</div>
            <div className="font-semibold text-gray-900">{ticketInfo?.ticketNumber}</div>
            <div className="text-sm text-gray-600 mt-1 truncate">{ticketInfo?.subject}</div>
          </div>

          {/* Rating Section */}
          <div className="p-6">
            <p className="text-center text-gray-700 mb-6">
              Hallo {ticketInfo?.customerName}, wie zufrieden waren Sie mit der Bearbeitung Ihres Anliegens?
            </p>

            {/* Stars */}
            <div className="flex justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-5xl transition-transform hover:scale-110 focus:outline-none"
                  aria-label={`${star} Sterne`}
                >
                  <span
                    className={
                      star <= (hoverRating || rating)
                        ? 'text-yellow-400'
                        : 'text-gray-300'
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>

            {/* Rating labels */}
            <div className="flex justify-between text-xs text-gray-500 mb-6 px-4">
              <span>Schlecht</span>
              <span>Ausgezeichnet</span>
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Möchten Sie uns noch etwas mitteilen? (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ihr Feedback..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0a4958]/20 focus:border-[#0a4958] resize-none"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full py-4 bg-[#0a4958] text-white rounded-xl font-semibold hover:bg-[#073440] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Wird gesendet...
                </>
              ) : (
                'Bewertung absenden'
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-6">
          FIT INN Hilfe-Center
        </p>
      </div>
    </div>
  );
}
