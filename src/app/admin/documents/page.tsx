"use client";

import { useState, useEffect, useCallback } from "react";

interface Document {
  id: string;
  filename: string;
  url: string;
  size: number;
  contentType: string;
  ocrText?: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  ocrError?: string;
  ticketId?: string;
  uploadedBy: string;
  uploadedAt: string;
  processedAt?: string;
  tags?: string[];
  // Search result fields
  matchedText?: string;
  score?: number;
}

interface DocumentStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<DocumentStats>({ total: 0, pending: 0, completed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [processingOcr, setProcessingOcr] = useState<string | null>(null);

  const loadDocuments = useCallback(async (query?: string) => {
    try {
      setIsSearching(!!query);
      const url = query
        ? `/api/admin/documents?q=${encodeURIComponent(query)}`
        : '/api/admin/documents';

      const res = await fetch(url, { credentials: 'same-origin' });

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error('Failed to load documents');
      }

      const data = await res.json();
      setDocuments(data.documents || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDocuments(searchQuery.trim() || undefined);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/documents', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData,
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || 'Upload failed');
        }
      }

      await loadDocuments();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Fehler beim Hochladen: ' + (err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!res.ok) throw new Error('Delete failed');

      await loadDocuments();
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Fehler beim Löschen');
    }
  };

  const handleProcessOcr = async (id: string) => {
    setProcessingOcr(id);
    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: 'POST',
        credentials: 'same-origin',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'OCR failed');

      await loadDocuments();
      if (selectedDoc?.id === id) {
        setSelectedDoc(data.document);
      }
    } catch (err) {
      console.error('OCR error:', err);
      alert('Fehler bei OCR: ' + (err as Error).message);
    } finally {
      setProcessingOcr(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOcrStatusBadge = (status: Document['ocrStatus']) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-600',
    };
    const labels: Record<string, string> = {
      pending: 'Ausstehend',
      processing: 'Verarbeitung...',
      completed: 'Fertig',
      failed: 'Fehler',
      skipped: 'Übersprungen',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType === 'application/pdf') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600">Dokumente</h1>
          <p className="text-apple-gray-400 text-sm mt-1">
            Dokumentenverwaltung mit OCR-Texterkennung
          </p>
        </div>

        {/* Upload Button */}
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white font-medium rounded-xl cursor-pointer hover:bg-brand-dark transition-colors">
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          )}
          <span>{uploading ? 'Lädt...' : 'Hochladen'}</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-apple-gray-100">
          <div className="text-2xl font-bold text-apple-gray-600">{stats.total}</div>
          <div className="text-sm text-apple-gray-400">Gesamt</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-apple-gray-100">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-apple-gray-400">OCR fertig</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-apple-gray-100">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-apple-gray-400">Ausstehend</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-apple-gray-100">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-apple-gray-400">Fehler</div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="In OCR-Text suchen... (z.B. Rechnung, Vertrag)"
            className="w-full px-4 py-3 pl-11 border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand border-t-transparent" />
            </div>
          )}
        </div>
      </form>

      {/* Document List */}
      <div className="flex gap-6">
        {/* List */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-apple-gray-100 divide-y divide-apple-gray-100">
            {documents.length === 0 ? (
              <div className="p-8 text-center text-apple-gray-400">
                {searchQuery ? 'Keine Dokumente gefunden' : 'Noch keine Dokumente hochgeladen'}
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-apple-gray-50 transition-colors ${
                    selectedDoc?.id === doc.id ? 'bg-brand/5' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-apple-gray-100 rounded-lg flex items-center justify-center">
                    {getFileIcon(doc.contentType)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-apple-gray-600 truncate">{doc.filename}</span>
                      {getOcrStatusBadge(doc.ocrStatus)}
                    </div>
                    <div className="text-sm text-apple-gray-400 flex items-center gap-2 mt-0.5">
                      <span>{formatFileSize(doc.size)}</span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                    </div>
                    {doc.matchedText && (
                      <div className="mt-1 text-sm text-apple-gray-500 bg-yellow-50 px-2 py-1 rounded">
                        ...{doc.matchedText}...
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {(doc.ocrStatus === 'pending' || doc.ocrStatus === 'failed') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleProcessOcr(doc.id); }}
                        disabled={processingOcr === doc.id}
                        className="p-2 text-brand hover:bg-brand/10 rounded-lg transition-colors disabled:opacity-50"
                        title="OCR starten"
                      >
                        {processingOcr === doc.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand border-t-transparent" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                      </button>
                    )}
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-apple-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                      title="Öffnen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                      className="p-2 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedDoc && (
          <div className="w-96 flex-shrink-0">
            <div className="bg-white rounded-xl border border-apple-gray-100 p-6 sticky top-24">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-apple-gray-600 truncate pr-4">{selectedDoc.filename}</h3>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-apple-gray-400 hover:text-apple-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Preview */}
              {selectedDoc.contentType.startsWith('image/') && (
                <div className="mb-4">
                  <img
                    src={selectedDoc.url}
                    alt={selectedDoc.filename}
                    className="w-full rounded-lg border border-apple-gray-100"
                  />
                </div>
              )}

              {/* Meta */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-apple-gray-400">Größe</span>
                  <span className="text-apple-gray-600">{formatFileSize(selectedDoc.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-apple-gray-400">Typ</span>
                  <span className="text-apple-gray-600">{selectedDoc.contentType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-apple-gray-400">Hochgeladen</span>
                  <span className="text-apple-gray-600">{formatDate(selectedDoc.uploadedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-apple-gray-400">OCR Status</span>
                  {getOcrStatusBadge(selectedDoc.ocrStatus)}
                </div>
                {selectedDoc.ticketId && (
                  <div className="flex justify-between">
                    <span className="text-apple-gray-400">Ticket</span>
                    <a href={`/admin/tickets/${selectedDoc.ticketId}`} className="text-brand hover:underline">
                      Zum Ticket
                    </a>
                  </div>
                )}
              </div>

              {/* OCR Text */}
              {selectedDoc.ocrText && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-apple-gray-600 mb-2">Erkannter Text</h4>
                  <div className="bg-apple-gray-50 rounded-lg p-3 text-sm text-apple-gray-600 max-h-64 overflow-y-auto whitespace-pre-wrap">
                    {selectedDoc.ocrText}
                  </div>
                </div>
              )}

              {/* OCR Error */}
              {selectedDoc.ocrError && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg">
                  <div className="text-sm font-medium text-red-800">OCR Fehler</div>
                  <div className="text-sm text-red-600 mt-1">{selectedDoc.ocrError}</div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-2">
                <a
                  href={selectedDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg text-center hover:bg-brand-dark transition-colors"
                >
                  Öffnen
                </a>
                {(selectedDoc.ocrStatus === 'pending' || selectedDoc.ocrStatus === 'failed') && (
                  <button
                    onClick={() => handleProcessOcr(selectedDoc.id)}
                    disabled={processingOcr === selectedDoc.id}
                    className="px-4 py-2 border border-brand text-brand text-sm font-medium rounded-lg hover:bg-brand/5 transition-colors disabled:opacity-50"
                  >
                    {processingOcr === selectedDoc.id ? 'Läuft...' : 'OCR starten'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
