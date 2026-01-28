'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface DocumentInfo {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
  isInvoice?: boolean;
  invoiceDate?: string;
  invoiceVendor?: string;
  invoiceAmount?: number;
}

interface BulkShareResponse {
  requiresPassword?: boolean;
  error?: string;
  message?: string;
  documentCount?: number;
  title?: string;
  documents?: DocumentInfo[];
}

export default function BulkSharePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentInfo | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Get token from params
  useEffect(() => {
    params.then(p => setToken(p.token));
  }, [params]);

  // Load documents when token is available
  useEffect(() => {
    if (!token) return;
    loadDocuments();
  }, [token]);

  const loadDocuments = async (pwd?: string) => {
    try {
      setLoading(true);
      setError(null);
      setPasswordError(null);

      const url = pwd
        ? `/api/documents/bulk-share/${token}?password=${encodeURIComponent(pwd)}`
        : `/api/documents/bulk-share/${token}`;

      const response = await fetch(url);
      const data: BulkShareResponse = await response.json();

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

      if (data.documents) {
        setDocuments(data.documents);
        setTitle(data.title || null);
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
      loadDocuments(password);
    }
  };

  const handleDownloadAll = async () => {
    setDownloading(true);
    try {
      const url = password
        ? `/api/documents/bulk-share/${token}?download=true&password=${encodeURIComponent(password)}`
        : `/api/documents/bulk-share/${token}?download=true`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Download fehlgeschlagen');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = title ? `${title}.zip` : `dokumente_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download fehlgeschlagen');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const isImage = (contentType: string) => contentType.startsWith('image/');
  const isPdf = (contentType: string) => contentType === 'application/pdf';

  const getFileIcon = (doc: DocumentInfo) => {
    if (isPdf(doc.contentType)) {
      return (
        <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
        </svg>
      );
    }
    if (isImage(doc.contentType)) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Dokumente werden geladen...</p>
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
            <p className="text-gray-600">Diese Dokumente sind passwortgeschützt.</p>
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

  // Calculate totals for invoices
  const invoices = documents.filter(d => d.isInvoice);
  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.invoiceAmount || 0), 0);
  const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-semibold text-gray-900 text-lg truncate">
              {title || 'Geteilte Dokumente'}
            </h1>
            <p className="text-sm text-gray-500">
              {documents.length} Dokument{documents.length !== 1 ? 'e' : ''} • {formatFileSize(totalSize)}
              {invoices.length > 0 && ` • ${invoices.length} Rechnung${invoices.length !== 1 ? 'en' : ''}`}
            </p>
          </div>

          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {downloading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            <span className="hidden sm:inline">Alle herunterladen</span>
          </button>
        </div>
      </header>

      {/* Summary Card (if invoices) */}
      {invoices.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 sm:p-6 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-blue-100 text-sm">Gesamtbetrag Rechnungen</p>
                <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalAmount)}</p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{invoices.length}</p>
                  <p className="text-blue-100 text-sm">Rechnungen</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{documents.length - invoices.length}</p>
                  <p className="text-blue-100 text-sm">Dokumente</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      <main className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setPreviewDoc(doc)}
              >
                {/* Thumbnail / Icon */}
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {isImage(doc.contentType) ? (
                    <Image
                      src={doc.url}
                      alt={doc.filename}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    getFileIcon(doc)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    <span>{formatFileSize(doc.size)}</span>
                    {doc.isInvoice && (
                      <>
                        {doc.invoiceDate && <span>• {formatDate(doc.invoiceDate)}</span>}
                        {doc.invoiceVendor && <span className="truncate">• {doc.invoiceVendor}</span>}
                      </>
                    )}
                  </div>
                </div>

                {/* Amount (for invoices) */}
                {doc.isInvoice && doc.invoiceAmount !== undefined && (
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-gray-900">{formatCurrency(doc.invoiceAmount)}</p>
                  </div>
                )}

                {/* Download single */}
                <a
                  href={doc.url}
                  download={doc.filename}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  title="Herunterladen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500">
        FIT INN Hilfe Center
      </footer>

      {/* Preview Modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getFileIcon(previewDoc)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{previewDoc.filename}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(previewDoc.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.filename}
                  className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Herunterladen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto bg-gray-100">
              {isPdf(previewDoc.contentType) ? (
                <iframe
                  src={`${previewDoc.url}#toolbar=1&navpanes=0`}
                  className="w-full h-[calc(95vh-120px)] min-h-[500px]"
                  title={previewDoc.filename}
                />
              ) : isImage(previewDoc.contentType) ? (
                <div className="flex items-center justify-center p-4 min-h-[500px]">
                  <Image
                    src={previewDoc.url}
                    alt={previewDoc.filename}
                    width={1200}
                    height={800}
                    className="max-w-full max-h-[calc(95vh-140px)] object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center min-h-[400px]">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow">
                    {getFileIcon(previewDoc)}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Vorschau nicht verfügbar</h2>
                  <p className="text-gray-600 mb-6">Für diesen Dateityp ist keine Vorschau verfügbar.</p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.filename}
                    className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Herunterladen
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
