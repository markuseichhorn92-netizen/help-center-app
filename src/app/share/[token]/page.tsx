'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface DocumentInfo {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

interface ShareResponse {
  requiresPassword?: boolean;
  error?: string;
  message?: string;
  id?: string;
  filename?: string;
  url?: string;
  contentType?: string;
  size?: number;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [document, setDocument] = useState<DocumentInfo | null>(null);

  // Get token from params
  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  // Load document when token is available
  useEffect(() => {
    if (!token) return;
    loadDocument();
  }, [token]);

  const loadDocument = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError(null);

      const url = pwd
        ? `/api/documents/share/${token}?password=${encodeURIComponent(pwd)}`
        : `/api/documents/share/${token}`;

      const response = await fetch(url);
      const data: ShareResponse = await response.json();

      if (data.requiresPassword && !pwd) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        if (data.requiresPassword) {
          setPasswordError(data.error || 'Falsches Passwort');
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Fehler beim Laden');
      }

      if (data.id && data.filename && data.url) {
        setDocument({
          id: data.id,
          filename: data.filename,
          url: data.url,
          contentType: data.contentType || 'application/octet-stream',
          size: data.size || 0,
        });
        setRequiresPassword(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loadDocument(password);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImage = (contentType: string) => contentType.startsWith('image/');
  const isPdf = (contentType: string) => contentType === 'application/pdf';

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Dokument wird geladen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Zugriff nicht möglich</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Password required state
  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Passwort erforderlich</h1>
            <p className="text-gray-600">Dieses Dokument ist passwortgeschützt.</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
            >
              Entsperren
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Document view
  if (!document) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              {isPdf(document.contentType) ? (
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                </svg>
              ) : isImage(document.contentType) ? (
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{document.filename}</h1>
              <p className="text-sm text-gray-500">{formatFileSize(document.size)}</p>
            </div>
          </div>

          <a
            href={`/api/documents/share/${token}?download=true${password ? `&password=${encodeURIComponent(password)}` : ''}`}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="hidden sm:inline">Herunterladen</span>
          </a>
        </div>
      </header>

      {/* Document Preview */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {isPdf(document.contentType) ? (
            <iframe
              src={`${document.url}#toolbar=1&navpanes=0`}
              className="w-full h-[calc(100vh-180px)] min-h-[500px]"
              title={document.filename}
            />
          ) : isImage(document.contentType) ? (
            <div className="flex items-center justify-center p-4 bg-gray-100 min-h-[500px]">
              <Image
                src={document.url}
                alt={document.filename}
                width={1200}
                height={800}
                className="max-w-full max-h-[calc(100vh-200px)] object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Vorschau nicht verfügbar</h2>
              <p className="text-gray-600 mb-6">Für diesen Dateityp ist keine Vorschau verfügbar.</p>
              <a
                href={`/api/documents/share/${token}?download=true${password ? `&password=${encodeURIComponent(password)}` : ''}`}
                className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Datei herunterladen
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500">
        FIT INN Hilfe Center
      </footer>
    </div>
  );
}
