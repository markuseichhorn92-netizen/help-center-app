"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

interface UploadProgress {
  filename: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  documentId?: string;
}

interface OcrProgress {
  documentId: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  error?: string;
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

  // Invoice filter states
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [debouncedInvoiceSearch, setDebouncedInvoiceSearch] = useState("");
  const [invoiceVendorFilter, setInvoiceVendorFilter] = useState("");
  const [invoiceDateFrom, setInvoiceDateFrom] = useState("");
  const [invoiceDateTo, setInvoiceDateTo] = useState("");
  const [invoiceAmountMin, setInvoiceAmountMin] = useState("");
  const [invoiceAmountMax, setInvoiceAmountMax] = useState("");
  const [invoiceSortBy, setInvoiceSortBy] = useState<'date' | 'amount' | 'vendor' | ''>('');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [availableVendors, setAvailableVendors] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Share modal states
  const [shareModalDoc, setShareModalDoc] = useState<Document | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiresIn, setShareExpiresIn] = useState<'none' | '1h' | '24h' | '7d' | '30d'>('none');
  const [shareLinks, setShareLinks] = useState<Array<{ token: string; shareUrl: string; createdAt: string; expiresAt?: string; hasPassword: boolean; accessCount: number }>>([]);
  const [creatingShare, setCreatingShare] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Drag & Drop states
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload & OCR progress states
  const [uploadQueue, setUploadQueue] = useState<UploadProgress[]>([]);
  const [ocrQueue, setOcrQueue] = useState<OcrProgress[]>([]);
  const [showProgressPanel, setShowProgressPanel] = useState(false);

  // Debounce invoice search - 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInvoiceSearch(invoiceSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [invoiceSearch]);

  // Load documents (not invoices - those are handled separately)
  const loadData = useCallback(async (query?: string) => {
    try {
      setIsSearching(!!query);

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
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [currentFolderId]);

  // Separate effect for invoice filters with debounced search
  useEffect(() => {
    if (activeTab !== 'invoices') return;

    const fetchInvoices = async () => {
      setIsSearching(true);
      try {
        const params = new URLSearchParams();
        if (debouncedInvoiceSearch) params.set('q', debouncedInvoiceSearch);
        if (invoiceVendorFilter) params.set('vendor', invoiceVendorFilter);
        if (invoiceDateFrom) params.set('dateFrom', invoiceDateFrom);
        if (invoiceDateTo) params.set('dateTo', invoiceDateTo);
        if (invoiceAmountMin) params.set('amountMin', invoiceAmountMin);
        if (invoiceAmountMax) params.set('amountMax', invoiceAmountMax);
        if (invoiceSortBy) {
          params.set('sortBy', invoiceSortBy);
          params.set('sortOrder', invoiceSortOrder);
        }

        const url = `/api/admin/documents/invoices${params.toString() ? '?' + params.toString() : ''}`;
        const res = await fetch(url, { credentials: 'same-origin' });
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
        if (data.vendors) {
          setAvailableVendors(data.vendors);
        }
      } catch (err) {
        console.error('Load error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    fetchInvoices();
  }, [activeTab, debouncedInvoiceSearch, invoiceVendorFilter, invoiceDateFrom, invoiceDateTo, invoiceAmountMin, invoiceAmountMax, invoiceSortBy, invoiceSortOrder]);

  // Reload invoices function (for use after mutations)
  const reloadInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedInvoiceSearch) params.set('q', debouncedInvoiceSearch);
      if (invoiceVendorFilter) params.set('vendor', invoiceVendorFilter);
      if (invoiceDateFrom) params.set('dateFrom', invoiceDateFrom);
      if (invoiceDateTo) params.set('dateTo', invoiceDateTo);
      if (invoiceAmountMin) params.set('amountMin', invoiceAmountMin);
      if (invoiceAmountMax) params.set('amountMax', invoiceAmountMax);
      if (invoiceSortBy) {
        params.set('sortBy', invoiceSortBy);
        params.set('sortOrder', invoiceSortOrder);
      }

      const url = `/api/admin/documents/invoices${params.toString() ? '?' + params.toString() : ''}`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setInvoicesByMonth(data.invoicesByMonth || {});
        setStats(data.stats || { total: 0, pending: 0, completed: 0, failed: 0, invoices: 0 });
        if (data.vendors) {
          setAvailableVendors(data.vendors);
        }
      }
    } catch (err) {
      console.error('Reload invoices error:', err);
    }
  }, [debouncedInvoiceSearch, invoiceVendorFilter, invoiceDateFrom, invoiceDateTo, invoiceAmountMin, invoiceAmountMax, invoiceSortBy, invoiceSortOrder]);

  // Reload based on active tab
  const reloadCurrentView = useCallback(async () => {
    if (activeTab === 'invoices') {
      await reloadInvoices();
    } else {
      await loadData();
    }
  }, [activeTab, loadData, reloadInvoices]);

  // Initial load effect
  useEffect(() => {
    if (activeTab === 'invoices') return; // Handled by separate effect
    setLoading(true);
    loadData();
  }, [loadData, activeTab]);

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

  // Close preview modal with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewDoc) {
        setPreviewDoc(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc]);

  // Poll OCR status for documents in queue
  useEffect(() => {
    if (ocrQueue.length === 0) return;

    const pollInterval = setInterval(async () => {
      const pendingItems = ocrQueue.filter(item => item.status === 'pending' || item.status === 'processing');
      if (pendingItems.length === 0) {
        clearInterval(pollInterval);
        return;
      }

      for (const item of pendingItems) {
        try {
          const res = await fetch(`/api/admin/documents/${item.documentId}`, { credentials: 'same-origin' });
          if (res.ok) {
            const data = await res.json();
            const newStatus = data.document?.ocrStatus || 'failed';

            setOcrQueue(prev => prev.map(q =>
              q.documentId === item.documentId
                ? { ...q, status: newStatus, error: data.document?.ocrError }
                : q
            ));

            // Also update upload queue if document was just uploaded
            setUploadQueue(prev => prev.map(u =>
              u.documentId === item.documentId
                ? { ...u, status: newStatus === 'completed' ? 'completed' : newStatus === 'failed' ? 'failed' : u.status }
                : u
            ));

            // Refresh data when OCR completes
            if (newStatus === 'completed' || newStatus === 'failed') {
              loadData();
            }
          }
        } catch (err) {
          console.error('Error polling OCR status:', err);
        }
      }

      // Auto-hide panel when all done
      const allDone = ocrQueue.every(item => item.status === 'completed' || item.status === 'failed' || item.status === 'skipped');
      const uploadsAllDone = uploadQueue.every(item => item.status === 'completed' || item.status === 'failed');
      if (allDone && uploadsAllDone) {
        setTimeout(() => {
          setShowProgressPanel(false);
          setOcrQueue([]);
          setUploadQueue([]);
        }, 3000);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [ocrQueue, uploadQueue, loadData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery.trim() || undefined);
  };

  // Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFilesUpload(files);
    }
  };

  const handleFilesUpload = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setShowProgressPanel(true);

    // Initialize upload queue
    const initialQueue: UploadProgress[] = Array.from(files).map(file => ({
      filename: file.name,
      status: 'uploading' as const,
      progress: 0,
    }));
    setUploadQueue(initialQueue);

    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      // Update status to uploading
      setUploadQueue(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: 'uploading' as const, progress: 50 } : item
      ));

      try {
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

        const data = await res.json();

        // Update to processing (OCR)
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'processing' as const, progress: 100, documentId: data.document?.id } : item
        ));

        // Add to OCR queue if document has pending OCR
        if (data.document?.ocrStatus === 'pending' || data.document?.ocrStatus === 'processing') {
          setOcrQueue(prev => [...prev, {
            documentId: data.document.id,
            filename: file.name,
            status: data.document.ocrStatus,
          }]);
        } else {
          // Mark as completed
          setUploadQueue(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'completed' as const } : item
          ));
        }

      } catch (err) {
        console.error('Upload error:', err);
        setUploadQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'failed' as const, error: (err as Error).message } : item
        ));
      }
    }

    await reloadCurrentView();
    setUploading(false);

    // Auto-hide after 3 seconds if all completed
    setTimeout(() => {
      setUploadQueue(prev => {
        const allDone = prev.every(item => item.status === 'completed' || item.status === 'failed');
        if (allDone && ocrQueue.length === 0) {
          setShowProgressPanel(false);
          return [];
        }
        return prev;
      });
    }, 3000);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await handleFilesUpload(files);
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (!res.ok) throw new Error('Delete failed');

      await reloadCurrentView();
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
      }
      if (previewDoc?.id === id) {
        setPreviewDoc(null);
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
      // Reload both views since this changes document type
      await loadData();
      await reloadInvoices();
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
      await reloadInvoices();
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

  // Share link functions
  const openShareModal = async (doc: Document) => {
    setShareModalDoc(doc);
    setSharePassword("");
    setShareExpiresIn('none');
    setCreatingShare(false);

    // Load existing share links
    try {
      const res = await fetch(`/api/admin/documents/${doc.id}/share`, { credentials: 'same-origin' });
      if (res.ok) {
        const data = await res.json();
        setShareLinks(data.shares || []);
      }
    } catch (err) {
      console.error('Error loading share links:', err);
    }
  };

  const createShareLink = async () => {
    if (!shareModalDoc) return;
    setCreatingShare(true);

    try {
      let expiresAt: string | undefined;
      if (shareExpiresIn !== 'none') {
        const now = new Date();
        switch (shareExpiresIn) {
          case '1h': now.setHours(now.getHours() + 1); break;
          case '24h': now.setHours(now.getHours() + 24); break;
          case '7d': now.setDate(now.getDate() + 7); break;
          case '30d': now.setDate(now.getDate() + 30); break;
        }
        expiresAt = now.toISOString();
      }

      const res = await fetch(`/api/admin/documents/${shareModalDoc.id}/share`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresAt,
          password: sharePassword || undefined,
        }),
      });

      if (res.ok) {
        const newShare = await res.json();
        setShareLinks(prev => [newShare, ...prev]);
        setSharePassword("");
        setShareExpiresIn('none');

        // Copy to clipboard
        await navigator.clipboard.writeText(newShare.shareUrl);
        setCopiedShareUrl(newShare.shareUrl);
        setTimeout(() => setCopiedShareUrl(null), 2000);
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      alert('Fehler beim Erstellen des Share-Links');
    } finally {
      setCreatingShare(false);
    }
  };

  const deleteShareLink = async (token: string) => {
    if (!shareModalDoc) return;

    try {
      const res = await fetch(`/api/admin/documents/${shareModalDoc.id}/share?token=${token}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      if (res.ok) {
        setShareLinks(prev => prev.filter(s => s.token !== token));
      }
    } catch (err) {
      console.error('Error deleting share link:', err);
    }
  };

  const copyShareUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedShareUrl(url);
    setTimeout(() => setCopiedShareUrl(null), 2000);
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

  const getFileIcon = (contentType: string, large = false) => {
    const size = large ? 'w-8 h-8' : 'w-5 h-5';
    if (contentType.startsWith('image/')) {
      return (
        <svg className={`${size} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType === 'application/pdf') {
      return (
        <svg className={`${size} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    // Word documents
    if (contentType.includes('word') || contentType.includes('document') || contentType === 'application/msword' || contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return (
        <svg className={`${size} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    // Excel documents
    if (contentType.includes('excel') || contentType.includes('spreadsheet') || contentType === 'application/vnd.ms-excel' || contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return (
        <svg className={`${size} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      );
    }
    return (
      <svg className={`${size} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  // Get thumbnail for document
  const getDocumentThumbnail = (doc: Document) => {
    if (doc.contentType.startsWith('image/')) {
      return (
        <img
          src={doc.url}
          alt={doc.filename}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-apple-gray-100">
        {getFileIcon(doc.contentType, true)}
      </div>
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
    <div
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-brand/10 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-dashed border-brand">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-brand mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xl font-semibold text-apple-gray-600">Dateien hier ablegen</p>
              <p className="text-sm text-apple-gray-400 mt-1">zum Hochladen</p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Tabs */}
      <div className="flex flex-col gap-4 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-apple-gray-600">Dokumentenverwaltung</h1>
            <p className="text-apple-gray-400 text-sm mt-1 hidden sm:block">
              Dokumente und Rechnungen mit OCR-Texterkennung
            </p>
          </div>

          {/* Upload Button */}
          <label className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-brand text-white font-medium rounded-xl cursor-pointer hover:bg-brand-dark transition-colors active:scale-95">
            {uploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            )}
            <span>{uploading ? 'Lädt...' : activeTab === 'invoices' ? 'Rechnungen hochladen' : 'Hochladen'}</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 sm:mb-6 border-b border-apple-gray-200 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('documents'); setCurrentFolderId(null); }}
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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
          className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
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

      {/* Stats - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-apple-gray-100">
          <div className="text-xl sm:text-2xl font-bold text-apple-gray-600">{stats.total}</div>
          <div className="text-xs sm:text-sm text-apple-gray-400">Gesamt</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-apple-gray-100">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-xs sm:text-sm text-apple-gray-400">OCR fertig</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-apple-gray-100">
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs sm:text-sm text-apple-gray-400">Ausstehend</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-apple-gray-100">
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-xs sm:text-sm text-apple-gray-400">Fehler</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-apple-gray-100 col-span-2 sm:col-span-1">
          <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.invoices}</div>
          <div className="text-xs sm:text-sm text-apple-gray-400">Rechnungen</div>
        </div>
      </div>

      {/* Upload & OCR Progress Panel */}
      {showProgressPanel && (uploadQueue.length > 0 || ocrQueue.length > 0) && (
        <div className="mb-4 sm:mb-6 bg-white rounded-xl border border-apple-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-apple-gray-50 border-b border-apple-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                {uploading || ocrQueue.some(q => q.status === 'processing' || q.status === 'pending') ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand border-t-transparent" />
                ) : (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="font-medium text-apple-gray-600 text-sm">
                  {uploading ? 'Dateien werden hochgeladen...' :
                   ocrQueue.some(q => q.status === 'processing' || q.status === 'pending') ? 'OCR-Verarbeitung läuft...' :
                   'Verarbeitung abgeschlossen'}
                </h3>
                <p className="text-xs text-apple-gray-400">
                  {uploadQueue.filter(u => u.status === 'completed').length}/{uploadQueue.length} hochgeladen
                  {ocrQueue.length > 0 && ` • ${ocrQueue.filter(o => o.status === 'completed').length}/${ocrQueue.length} OCR fertig`}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowProgressPanel(false);
                if (!uploading) {
                  setUploadQueue([]);
                  setOcrQueue([]);
                }
              }}
              className="p-1.5 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Items */}
          <div className="max-h-48 overflow-y-auto divide-y divide-apple-gray-100">
            {uploadQueue.map((item, idx) => (
              <div key={idx} className="px-4 py-2.5 flex items-center gap-3">
                {/* Status Icon */}
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {item.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand border-t-transparent" />
                  )}
                  {item.status === 'processing' && (
                    <div className="animate-pulse">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {item.status === 'failed' && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>

                {/* Filename & Status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-apple-gray-600 truncate">{item.filename}</p>
                  <p className="text-xs text-apple-gray-400">
                    {item.status === 'uploading' && 'Wird hochgeladen...'}
                    {item.status === 'processing' && 'OCR-Verarbeitung...'}
                    {item.status === 'completed' && 'Fertig'}
                    {item.status === 'failed' && (item.error || 'Fehler')}
                  </p>
                </div>

                {/* Progress Bar */}
                {(item.status === 'uploading' || item.status === 'processing') && (
                  <div className="w-20 h-1.5 bg-apple-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.status === 'uploading' ? 'bg-brand' : 'bg-blue-500'
                      }`}
                      style={{ width: item.status === 'processing' ? '100%' : `${item.progress || 0}%` }}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* OCR Queue Items (separate from upload) */}
            {ocrQueue.filter(o => !uploadQueue.some(u => u.documentId === o.documentId)).map((item) => (
              <div key={item.documentId} className="px-4 py-2.5 flex items-center gap-3">
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                  {(item.status === 'pending' || item.status === 'processing') && (
                    <div className="animate-pulse">
                      <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {item.status === 'failed' && (
                    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-apple-gray-600 truncate">{item.filename}</p>
                  <p className="text-xs text-apple-gray-400">
                    {item.status === 'pending' && 'OCR wartet...'}
                    {item.status === 'processing' && 'OCR-Verarbeitung...'}
                    {item.status === 'completed' && 'OCR fertig'}
                    {item.status === 'failed' && (item.error || 'OCR fehlgeschlagen')}
                  </p>
                </div>
                {(item.status === 'pending' || item.status === 'processing') && (
                  <div className="w-20 h-1.5 bg-apple-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search (Documents Tab only) */}
      {activeTab === 'documents' && (
        <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="In OCR-Text suchen..."
              className="w-full px-4 py-3 pl-11 border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-base"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={`hover:text-brand whitespace-nowrap ${!currentFolderId ? 'font-medium text-brand' : 'text-apple-gray-400'}`}
              >
                Alle Dokumente
              </button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-apple-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                  <button
                    onClick={() => setCurrentFolderId(folder.id)}
                    className={`hover:text-brand whitespace-nowrap ${
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
                className="text-sm text-apple-gray-400 hover:text-brand flex items-center gap-1 py-2 sm:py-0"
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
                  className="px-3 py-2 text-sm border border-apple-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 flex-1 sm:flex-none"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-3 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark"
                >
                  Erstellen
                </button>
                <button
                  onClick={() => { setCreatingFolder(false); setNewFolderName(""); }}
                  className="px-3 py-2 text-sm text-apple-gray-400 hover:text-apple-gray-600"
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {/* Folders - Grid Layout */}
          {folders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="bg-white rounded-xl border border-apple-gray-100 p-4 cursor-pointer hover:shadow-md hover:border-brand/30 transition-all group"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-yellow-100 rounded-xl flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <svg className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-apple-gray-600 text-sm truncate w-full">{folder.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                    className="absolute top-2 right-2 p-1.5 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Documents - Grid Layout (Dropbox-Style) */}
          {documents.filter(d => !d.isInvoice).length === 0 && folders.length === 0 ? (
            <div className="bg-white rounded-xl border border-apple-gray-100 p-8 text-center text-apple-gray-400">
              <svg className="w-16 h-16 mx-auto text-apple-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-lg font-medium mb-1">{searchQuery ? 'Keine Dokumente gefunden' : 'Dieser Ordner ist leer'}</p>
              <p className="text-sm">Ziehen Sie Dateien hierher oder klicken Sie auf Hochladen</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {documents.filter(d => !d.isInvoice).map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className={`bg-white rounded-xl border border-apple-gray-100 overflow-hidden cursor-pointer hover:shadow-md hover:border-brand/30 transition-all group ${
                    selectedDoc?.id === doc.id ? 'ring-2 ring-brand' : ''
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square overflow-hidden bg-apple-gray-50 relative">
                    {getDocumentThumbnail(doc)}
                    {/* Hover Actions */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                        className="p-2 bg-white rounded-full text-apple-gray-600 hover:bg-brand hover:text-white transition-colors"
                        title="Vorschau"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <a
                        href={`/api/admin/documents/${doc.id}/download`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-white rounded-full text-apple-gray-600 hover:bg-green-500 hover:text-white transition-colors"
                        title="Herunterladen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </a>
                      <button
                        onClick={(e) => { e.stopPropagation(); openShareModal(doc); }}
                        className="p-2 bg-white rounded-full text-apple-gray-600 hover:bg-blue-500 hover:text-white transition-colors"
                        title="Teilen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                      </button>
                    </div>
                    {/* OCR Badge */}
                    <div className="absolute top-2 right-2">
                      {getOcrStatusBadge(doc.ocrStatus)}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="font-medium text-apple-gray-600 text-sm truncate" title={doc.filename}>
                      {doc.filename}
                    </p>
                    <p className="text-xs text-apple-gray-400 mt-1">
                      {formatFileSize(doc.size)} • {formatDate(doc.uploadedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* INVOICES TAB */}
      {activeTab === 'invoices' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-apple-gray-100 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="Suchen (Dateiname, Lieferant, Nr.)..."
                  className="w-full px-4 py-3 pl-10 border border-apple-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand text-base"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-apple-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {debouncedInvoiceSearch !== invoiceSearch && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Filter & Sort Buttons */}
              <div className="flex items-center gap-2">
                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                    showFilters || invoiceVendorFilter || invoiceDateFrom || invoiceDateTo || invoiceAmountMin || invoiceAmountMax
                      ? 'bg-brand/10 text-brand'
                      : 'bg-apple-gray-100 text-apple-gray-600 hover:bg-apple-gray-200'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span className="hidden sm:inline">Filter</span>
                  {(invoiceVendorFilter || invoiceDateFrom || invoiceDateTo || invoiceAmountMin || invoiceAmountMax) && (
                    <span className="w-2 h-2 bg-brand rounded-full"></span>
                  )}
                </button>

                {/* Sort Dropdown */}
                <select
                  value={invoiceSortBy}
                  onChange={(e) => setInvoiceSortBy(e.target.value as '' | 'date' | 'amount' | 'vendor')}
                  className="px-3 py-3 border border-apple-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  <option value="">Sortierung</option>
                  <option value="date">Nach Datum</option>
                  <option value="amount">Nach Betrag</option>
                  <option value="vendor">Nach Lieferant</option>
                </select>

                {invoiceSortBy && (
                  <button
                    onClick={() => setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-3 border border-apple-gray-200 rounded-xl hover:bg-apple-gray-50"
                    title={invoiceSortOrder === 'asc' ? 'Aufsteigend' : 'Absteigend'}
                  >
                    <svg className={`w-5 h-5 transition-transform ${invoiceSortOrder === 'asc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Filters */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4 pt-4 border-t border-apple-gray-100">
                {/* Vendor Filter */}
                <div>
                  <label className="block text-xs text-apple-gray-400 mb-1">Lieferant</label>
                  <select
                    value={invoiceVendorFilter}
                    onChange={(e) => setInvoiceVendorFilter(e.target.value)}
                    className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="">Alle Lieferanten</option>
                    {availableVendors.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs text-apple-gray-400 mb-1">Von</label>
                  <input
                    type="date"
                    value={invoiceDateFrom}
                    onChange={(e) => setInvoiceDateFrom(e.target.value)}
                    className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block text-xs text-apple-gray-400 mb-1">Bis</label>
                  <input
                    type="date"
                    value={invoiceDateTo}
                    onChange={(e) => setInvoiceDateTo(e.target.value)}
                    className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>

                {/* Amount Range */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-apple-gray-400 mb-1">Min €</label>
                    <input
                      type="number"
                      value={invoiceAmountMin}
                      onChange={(e) => setInvoiceAmountMin(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-apple-gray-400 mb-1">Max €</label>
                    <input
                      type="number"
                      value={invoiceAmountMax}
                      onChange={(e) => setInvoiceAmountMax(e.target.value)}
                      placeholder="∞"
                      className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {(invoiceSearch || invoiceVendorFilter || invoiceDateFrom || invoiceDateTo || invoiceAmountMin || invoiceAmountMax || invoiceSortBy) && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setInvoiceSearch('');
                    setInvoiceVendorFilter('');
                    setInvoiceDateFrom('');
                    setInvoiceDateTo('');
                    setInvoiceAmountMin('');
                    setInvoiceAmountMax('');
                    setInvoiceSortBy('');
                  }}
                  className="text-sm text-apple-gray-400 hover:text-apple-gray-600 py-2"
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </div>

          {Object.keys(invoicesByMonth).length === 0 ? (
            <div className="bg-white rounded-xl border border-apple-gray-100 p-8 text-center text-apple-gray-400">
              <svg className="w-16 h-16 mx-auto text-apple-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <p className="text-lg font-medium mb-1">Noch keine Rechnungen vorhanden</p>
              <p className="text-sm">Laden Sie Rechnungen hoch um sie hier zu verwalten</p>
            </div>
          ) : (
            Object.entries(invoicesByMonth)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, invoices]) => (
                <div key={month} className="bg-white rounded-xl border border-apple-gray-100 overflow-hidden">
                  {/* Month Header */}
                  <div className="px-4 sm:px-6 py-3 sm:py-4 bg-apple-gray-50 border-b border-apple-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-apple-gray-600 text-sm sm:text-base">{formatMonthYear(month)}</h3>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm text-apple-gray-400">{invoices.length} Rechnungen</span>
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/admin/documents/export', {
                              method: 'POST',
                              credentials: 'same-origin',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ month, invoicesOnly: true }),
                            });
                            if (!res.ok) {
                              const data = await res.json();
                              alert(data.error || 'Export fehlgeschlagen');
                              return;
                            }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Rechnungen_${formatMonthYear(month).replace(' ', '_')}.zip`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch (err) {
                            console.error('Export error:', err);
                            alert('Export fehlgeschlagen');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand/10 rounded-lg transition-colors flex items-center gap-1"
                        title="Monat als ZIP exportieren"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="hidden sm:inline">ZIP</span>
                      </button>
                    </div>
                  </div>

                  {/* Invoices in this month */}
                  <div className="divide-y divide-apple-gray-100">
                    {invoices.map((invoice) => (
                      <div key={invoice.id} className="p-3 sm:p-4 hover:bg-apple-gray-50 transition-colors">
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
                                  className="w-full px-3 py-2 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-apple-gray-400">Rechnungsnummer</label>
                                <input
                                  type="text"
                                  value={invoiceEditData.invoiceNumber || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceNumber: e.target.value })}
                                  className="w-full px-3 py-2 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-apple-gray-400">Betrag (EUR)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={invoiceEditData.invoiceAmount || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceAmount: e.target.value })}
                                  className="w-full px-3 py-2 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-apple-gray-400">Lieferant</label>
                                <input
                                  type="text"
                                  value={invoiceEditData.invoiceVendor || ''}
                                  onChange={(e) => setInvoiceEditData({ ...invoiceEditData, invoiceVendor: e.target.value })}
                                  className="w-full px-3 py-2 text-sm border border-apple-gray-200 rounded-lg"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveInvoiceData(invoice.id)}
                                className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-dark"
                              >
                                Speichern
                              </button>
                              <button
                                onClick={() => setEditingInvoice(null)}
                                className="px-4 py-2 text-sm text-apple-gray-400 hover:text-apple-gray-600"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div
                              className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-apple-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-apple-gray-200 transition-colors"
                              onClick={() => setPreviewDoc(invoice)}
                            >
                              {getFileIcon(invoice.contentType)}
                            </div>
                            <div className="flex-1 min-w-0" onClick={() => setPreviewDoc(invoice)}>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-apple-gray-600 truncate text-sm sm:text-base">{invoice.filename}</span>
                                <span className="hidden sm:inline">{getOcrStatusBadge(invoice.ocrStatus)}</span>
                              </div>
                              <div className="text-xs sm:text-sm text-apple-gray-400 flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5">
                                {invoice.invoiceDate && (
                                  <span>{formatDate(invoice.invoiceDate)}</span>
                                )}
                                {invoice.invoiceNumber && (
                                  <span className="hidden sm:inline">Nr. {invoice.invoiceNumber}</span>
                                )}
                                {invoice.invoiceVendor && (
                                  <span className="truncate max-w-[100px] sm:max-w-none">{invoice.invoiceVendor}</span>
                                )}
                                {invoice.invoiceAmount !== undefined && (
                                  <span className="font-medium text-apple-gray-600">{formatCurrency(invoice.invoiceAmount)}</span>
                                )}
                              </div>
                            </div>
                            {/* Actions */}
                            <div className="flex items-center gap-1 sm:gap-2">
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
                                className="p-2 sm:p-2.5 text-apple-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                title="Bearbeiten"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <a
                                href={`/api/admin/documents/${invoice.id}/download`}
                                className="p-2 sm:p-2.5 text-apple-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Herunterladen"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                              <button
                                onClick={() => openShareModal(invoice)}
                                className="p-2 sm:p-2.5 text-apple-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Teilen"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(invoice.id)}
                                className="p-2 sm:p-2.5 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Löschen"
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-apple-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-apple-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getFileIcon(previewDoc.contentType)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-apple-gray-600 truncate">{previewDoc.filename}</h3>
                  <p className="text-sm text-apple-gray-400">
                    {formatFileSize(previewDoc.size)} • {formatDate(previewDoc.uploadedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 text-apple-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                  title="In neuem Tab öffnen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a
                  href={`/api/admin/documents/${previewDoc.id}/download`}
                  className="p-2.5 text-apple-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Herunterladen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                <button
                  onClick={() => openShareModal(previewDoc)}
                  className="p-2.5 text-apple-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Teilen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-2.5 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-apple-gray-50">
              {previewDoc.contentType.startsWith('image/') ? (
                <div className="flex items-center justify-center min-h-[50vh]">
                  <img
                    src={previewDoc.url}
                    alt={previewDoc.filename}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.contentType === 'application/pdf' ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[80vh] rounded-lg border border-apple-gray-200"
                  title={previewDoc.filename}
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[50vh] text-apple-gray-400">
                  <div className="w-20 h-20 bg-apple-gray-100 rounded-2xl flex items-center justify-center mb-4">
                    {getFileIcon(previewDoc.contentType, true)}
                  </div>
                  <p className="text-lg font-medium mb-2">Vorschau nicht verfügbar</p>
                  <p className="text-sm mb-4">Für diesen Dateityp gibt es keine Vorschau</p>
                  <a
                    href={`/api/admin/documents/${previewDoc.id}/download`}
                    className="px-4 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition-colors"
                  >
                    Datei herunterladen
                  </a>
                </div>
              )}
            </div>

            {/* OCR Text (if available) */}
            {previewDoc.ocrText && (
              <div className="p-4 sm:p-6 border-t border-apple-gray-100 max-h-48 overflow-y-auto flex-shrink-0">
                <h4 className="text-sm font-medium text-apple-gray-600 mb-2">Erkannter Text (OCR)</h4>
                <div className="bg-apple-gray-50 rounded-lg p-3 text-sm text-apple-gray-600 whitespace-pre-wrap">
                  {previewDoc.ocrText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareModalDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShareModalDoc(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-apple-gray-100 flex-shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-apple-gray-600">Dokument teilen</h3>
                <p className="text-sm text-apple-gray-400 truncate">{shareModalDoc.filename}</p>
              </div>
              <button
                onClick={() => setShareModalDoc(null)}
                className="p-2 text-apple-gray-400 hover:text-apple-gray-600 hover:bg-apple-gray-100 rounded-lg flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Create new share link */}
            <div className="p-4 sm:p-6 border-b border-apple-gray-100">
              <h4 className="text-sm font-medium text-apple-gray-600 mb-4">Neuen Link erstellen</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-apple-gray-400 mb-1">Gültigkeit</label>
                  <select
                    value={shareExpiresIn}
                    onChange={(e) => setShareExpiresIn(e.target.value as typeof shareExpiresIn)}
                    className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="none">Unbegrenzt</option>
                    <option value="1h">1 Stunde</option>
                    <option value="24h">24 Stunden</option>
                    <option value="7d">7 Tage</option>
                    <option value="30d">30 Tage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-apple-gray-400 mb-1">Passwort (optional)</label>
                  <input
                    type="text"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Leer für öffentlichen Zugang"
                    className="w-full px-3 py-3 border border-apple-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <button
                  onClick={createShareLink}
                  disabled={creatingShare}
                  className="w-full px-4 py-3 bg-brand text-white font-medium rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingShare ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  )}
                  Link erstellen & kopieren
                </button>
              </div>
            </div>

            {/* Existing share links */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <h4 className="text-sm font-medium text-apple-gray-600 mb-3">
                Aktive Links ({shareLinks.length})
              </h4>
              {shareLinks.length === 0 ? (
                <p className="text-sm text-apple-gray-400">Noch keine Links erstellt</p>
              ) : (
                <div className="space-y-3">
                  {shareLinks.map((link) => (
                    <div key={link.token} className="flex items-center gap-3 p-3 bg-apple-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm">
                          {link.hasPassword && (
                            <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                          <span className="text-apple-gray-600 truncate font-mono text-xs">
                            ...{link.token.slice(-8)}
                          </span>
                          <span className="text-apple-gray-400">•</span>
                          <span className="text-apple-gray-400">{link.accessCount} Aufrufe</span>
                        </div>
                        <div className="text-xs text-apple-gray-400 mt-1">
                          {link.expiresAt ? `Läuft ab: ${new Date(link.expiresAt).toLocaleDateString('de-DE')}` : 'Unbegrenzt'}
                        </div>
                      </div>
                      <button
                        onClick={() => copyShareUrl(link.shareUrl)}
                        className={`p-2.5 rounded-lg transition-colors ${
                          copiedShareUrl === link.shareUrl
                            ? 'bg-green-100 text-green-600'
                            : 'text-apple-gray-400 hover:text-brand hover:bg-brand/10'
                        }`}
                        title="Link kopieren"
                      >
                        {copiedShareUrl === link.shareUrl ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => deleteShareLink(link.token)}
                        className="p-2.5 text-apple-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Link löschen"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
