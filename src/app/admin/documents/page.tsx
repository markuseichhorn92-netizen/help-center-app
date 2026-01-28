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
  isInvoice?: boolean;
  invoiceDate?: string;
  invoiceNumber?: string;
  invoiceAmount?: number;
  invoiceVendor?: string;
  folderId?: string;
  matchedText?: string;
  score?: number;
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  invoices: number;
}

type Tab = 'documents' | 'invoices';

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [invoicesByMonth, setInvoicesByMonth] = useState<Record<string, Document[]>>({});
  const [stats, setStats] = useState<DocumentStats>({ total: 0, pending: 0, completed: 0, failed: 0, invoices: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [processingOcr, setProcessingOcr] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [invoiceEditData, setInvoiceEditData] = useState<{
    invoiceDate?: string;
    invoiceNumber?: string;
    invoiceAmount?: string;
    invoiceVendor?: string;
  }>({});

  // Load documents based on active tab and folder
  const loadData = useCallback(async (query?: string) => {
    try {
      setIsSearching(!!query);

      if (activeTab === 'invoices') {
        // Load invoices grouped by month
        const res = await fetch('/api/admin/documents/invoices', { credentials: 'same-origin' });
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/admin/login';
            return;
          }
          throw new Error('Failed to load invoices');
        }
        const data = await res.json();
        setInvoicesByMonth(data.invoicesByMonth || {});
        setStats(data.stats || { total: 0, pending: 0, completed: 0, failed: 0, invoices: 0 });
      } else {
        // Load documents and folders
        const url = query
          ? `/api/admin/documents?q=${encodeURIComponent(query)}`
          : `/api/admin/documents?folderId=${currentFolderId || ''}`;

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
        setFolders(data.folders || []);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [activeTab, currentFolderId]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  // Build folder path for breadcrumb
  const loadFolderPath = useCallback(async (folderId: string | null) => {
    if (!folderId) {
      setFolderPath([]);
      return;
    }

    const path: Folder[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const response: Response = await fetch(`/api/admin/documents/folders/${currentId}`, { credentials: 'same-origin' });
      if (!response.ok) break;
      const folder: Folder = await response.json();
      path.unshift(folder);
      currentId = folder.parentId || null;
    }

    setFolderPath(path);
  }, []);

  useEffect(() => {
    loadFolderPath(currentFolderId);
  }, [currentFolderId, loadFolderPath]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery.trim() || undefined);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) {
          formData.append('folderId', currentFolderId);
        }
        if (activeTab === 'invoices') {
          formData.append('isInvoice', 'true');
        }

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

      await loadData();
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

      await loadData();
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

      await loadData();
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

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const res = await fetch('/api/admin/documents/folders', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
        }),
      });

      if (!res.ok) throw new Error('Failed to create folder');

      setNewFolderName("");
      setCreatingFolder(false);
      await loadData();
    } catch (err) {
      console.error('Create folder error:', err);
      alert('Fehler beim Erstellen des Ordners');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm('Ordner wirklich löschen? Dokumente werden in den übergeordneten Ordner verschoben.')) return;

    try {
      const res = await fetch(`/api/admin/documents/folders/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!res.ok) throw new Error('Delete failed');
      await loadData();
    } catch (err) {
      console.error('Delete folder error:', err);
      alert('Fehler beim Löschen des Ordners');
    }
  };

  const handleMarkAsInvoice = async (id: string, isInvoice: boolean) => {
    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isInvoice }),
      });

      if (!res.ok) throw new Error('Update failed');
      await loadData();
    } catch (err) {
      console.error('Update error:', err);
      alert('Fehler beim Aktualisieren');
    }
  };

  const handleSaveInvoiceData = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isInvoice: true,
          invoiceDate: invoiceEditData.invoiceDate || undefined,
          invoiceNumber: invoiceEditData.invoiceNumber || undefined,
          invoiceAmount: invoiceEditData.invoiceAmount ? parseFloat(invoiceEditData.invoiceAmount) : undefined,
          invoiceVendor: invoiceEditData.invoiceVendor || undefined,
        }),
      });

      if (!res.ok) throw new Error('Update failed');
      setEditingInvoice(null);
      await loadData();
    } catch (err) {
      console.error('Update error:', err);
      alert('Fehler beim Speichern');
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
    });
  };

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
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
      {/* Header with Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-apple-gray-600">Dokumentenverwaltung</h1>
          <p className="text-apple-gray-400 text-sm mt-1">
            Dokumente und Rechnungen mit OCR-Texterkennung
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
          <span>{uploading ? 'Lädt...' : activeTab === 'invoices' ? 'Rechnung hochladen' : 'Hochladen'}</span>
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

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-apple-gray-200">
        <button
          onClick={() => { setActiveTab('documents'); setCurrentFolderId(null); }}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'documents'
              ? 'border-brand text-brand'
              : 'border-transparent text-apple-gray-400 hover:text-apple-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Dokumente
          </div>
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-brand text-brand'
              : 'border-transparent text-apple-gray-400 hover:text-apple-gray-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            Rechnungen
            {stats.invoices > 0 && (
              <span className="bg-brand/10 text-brand px-2 py-0.5 rounded-full text-xs">
                {stats.invoices}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
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
        <div className="bg-white rounded-xl p-4 border border-apple-gray-100">
          <div className="text-2xl font-bold text-blue-600">{stats.invoices}</div>
          <div className="text-sm text-apple-gray-400">Rechnungen</div>
        </div>
      </div>

      {/* Search (Documents Tab only) */}
      {activeTab === 'documents' && (
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="In OCR-Text suchen..."
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
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <>
          {/* Breadcrumb & Folder Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-brand ${!currentFolderId ? 'font-medium text-brand' : 'text-apple-gray-400'}`}
              >
                Alle Dokumente
              </button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-apple-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className={`hover:text-brand ${
                      index === folderPath.length - 1 ? 'font-medium text-brand' : 'text-apple-gray-400'
                    }`}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>

            {/* New Folder Button */}
            {!creatingFolder ? (
              <button
                onClick={() => setCreatingFolder(true)}
                className="text-sm text-apple-gray-400 hover:text-brand flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Neuer Ordner
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ordnername"
                  className="px-3 py-1.5 text-sm border border-apple-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-3 py-1.5 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark"
                >
                  Erstellen
                </button>
                <button
                  onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}
                  className="px-3 py-1.5 text-sm text-apple-gray-400 hover:text-apple-gray-600"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {/* Folders & Documents List */}
          <div className="flex gap-6">
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-apple-gray-100 divide-y divide-apple-gray-100">
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-4 flex items-center gap-4 cursor-pointer hover:bg-apple-gray-50 transition-colors"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-apple-gray-600">{folder.name}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                      className="p-2 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Documents */}
                {documents.filter(d => !d.isInvoice).length === 0 && folders.length === 0 ? (
                  <div className="p-8 text-center text-apple-gray-400">
                    {searchQuery ? 'Keine Dokumente gefunden' : 'Dieser Ordner ist leer'}
                  </div>
                ) : (
                  documents.filter(d => !d.isInvoice).map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-apple-gray-50 transition-colors ${
                        selectedDoc?.id === doc.id ? 'bg-brand/5' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-apple-gray-100 rounded-lg flex items-center justify-center">
                        {getFileIcon(doc.contentType)}
                      </div>
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
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsInvoice(doc.id, true); }}
                          className="p-2 text-apple-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Als Rechnung markieren"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                          </svg>
                        </button>
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
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                          className="p-2 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                    <button onClick={() => setSelectedDoc(null)} className="text-apple-gray-400 hover:text-apple-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {selectedDoc.contentType.startsWith('image/') && (
                    <div className="mb-4">
                      <img src={selectedDoc.url} alt={selectedDoc.filename} className="w-full rounded-lg border border-apple-gray-100" />
                    </div>
                  )}

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-apple-gray-400">Größe</span>
                      <span className="text-apple-gray-600">{formatFileSize(selectedDoc.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-apple-gray-400">Hochgeladen</span>
                      <span className="text-apple-gray-600">{formatDate(selectedDoc.uploadedAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-apple-gray-400">OCR Status</span>
                      {getOcrStatusBadge(selectedDoc.ocrStatus)}
                    </div>
                  </div>

                  {selectedDoc.ocrText && (
                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-apple-gray-600 mb-2">Erkannter Text</h4>
                      <div className="bg-apple-gray-50 rounded-lg p-3 text-sm text-apple-gray-600 max-h-64 overflow-y-auto whitespace-pre-wrap">
                        {selectedDoc.ocrText}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex gap-2">
                    <a
                      href={selectedDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg text-center hover:bg-brand-dark transition-colors"
                    >
                      Öffnen
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {Object.keys(invoicesByMonth).length === 0 ? (
            <div className="bg-white rounded-xl border border-apple-gray-100 p-8 text-center text-apple-gray-400">
              Noch keine Rechnungen vorhanden
            </div>
          ) : (
            Object.entries(invoicesByMonth)
              .sort(([a], [b]) => b.localeCompare(a)) // Sort by month descending
              .map(([month, invoices]) => (
                <div key={month} className="bg-white rounded-xl border border-apple-gray-100 overflow-hidden">
                  {/* Month Header */}
                  <div className="px-6 py-4 bg-apple-gray-50 border-b border-apple-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-apple-gray-600">{formatMonthYear(month)}</h3>
                    <span className="text-sm text-apple-gray-400">{invoices.length} Rechnungen</span>
                  </div>

                  {/* Invoices in this month */}
                  <div className="divide-y divide-apple-gray-100">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="p-4 hover:bg-apple-gray-50 transition-colors">
                        {editingInvoice === invoice.id ? (
                          /* Edit Mode */
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-apple-gray-400">Rechnungsdatum</label>
                                <input
                                  type="date"
                                  value={invoiceEditData.invoiceDate || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceDate: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-apple-gray-400">Rechnungsnummer</label>
                                <input
                                  type="text"
                                  value={invoiceEditData.invoiceNumber || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceNumber: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-apple-gray-400">Betrag (EUR)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={invoiceEditData.invoiceAmount || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceAmount: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-apple-gray-400">Lieferant</label>
                                <input
                                  type="text"
                                  value={invoiceEditData.invoiceVendor || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceVendor: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveInvoiceData(invoice.id)}
                                className="px-3 py-1.5 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark"
                              >
                                Speichern
                              </button>
                              <button
                                onClick={() => setEditingInvoice(null)}
                                className="px-3 py-1.5 text-sm text-apple-gray-400 hover:text-apple-gray-600"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-apple-gray-100 rounded-lg flex items-center justify-center">
                              {getFileIcon(invoice.contentType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-apple-gray-600 truncate">{invoice.filename}</span>
                                {getOcrStatusBadge(invoice.ocrStatus)}
                              </div>
                              <div className="text-sm text-apple-gray-400 flex items-center gap-3 mt-0.5">
                                {invoice.invoiceDate && (
                                  <span>{formatDate(invoice.invoiceDate)}</span>
                                )}
                                {invoice.invoiceNumber && (
                                  <span>Nr. {invoice.invoiceNumber}</span>
                                )}
                                {invoice.invoiceVendor && (
                                  <span>{invoice.invoiceVendor}</span>
                                )}
                                {invoice.invoiceAmount !== undefined && (
                                  <span className="font-medium text-apple-gray-600">{formatCurrency(invoice.invoiceAmount)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingInvoice(invoice.id);
                                  setInvoiceEditData({
                                    invoiceDate: invoice.invoiceDate || '',
                                    invoiceNumber: invoice.invoiceNumber || '',
                                    invoiceAmount: invoice.invoiceAmount?.toString() || '',
                                    invoiceVendor: invoice.invoiceVendor || '',
                                  });
                                }}
                                className="p-2 text-apple-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                title="Bearbeiten"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleMarkAsInvoice(invoice.id, false)}
                                className="p-2 text-apple-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Keine Rechnung"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              </button>
                              <a
                                href={invoice.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-apple-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="p-2 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
