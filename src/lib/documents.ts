import { kv } from './kv';

// Types
export interface Document {
  [key: string]: unknown; // Index signature for KV storage
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
  // Invoice fields
  isInvoice?: boolean;
  invoiceDate?: string; // ISO date string (YYYY-MM-DD)
  invoiceNumber?: string;
  invoiceAmount?: number;
  invoiceVendor?: string;
  // Folder organization
  folderId?: string;
}

export interface Folder {
  [key: string]: unknown;
  id: string;
  name: string;
  parentId?: string; // For nested folders
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSearchResult {
  document: Document;
  matchedText?: string;
  score: number;
}

// Helper: Generate document ID
function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Check if file type supports OCR
function isOcrSupported(contentType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/tiff',
    'application/pdf',
  ];
  return supportedTypes.includes(contentType.toLowerCase());
}

// Document CRUD Operations

export async function createDocument(data: {
  filename: string;
  url: string;
  size: number;
  contentType: string;
  ticketId?: string;
  uploadedBy: string;
  tags?: string[];
}): Promise<Document> {
  const id = generateDocumentId();
  const now = new Date().toISOString();

  const document: Document = {
    id,
    filename: data.filename,
    url: data.url,
    size: data.size,
    contentType: data.contentType,
    ocrStatus: isOcrSupported(data.contentType) ? 'pending' : 'skipped',
    uploadedBy: data.uploadedBy,
    uploadedAt: now,
  };

  // Only add ticketId if provided (Redis doesn't support null values)
  if (data.ticketId) {
    document.ticketId = data.ticketId;
  }

  // Only add tags if provided and non-empty
  if (data.tags && data.tags.length > 0) {
    document.tags = data.tags;
  }

  // Filter out any null/undefined values before saving to KV
  const cleanDocument: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(document)) {
    if (value !== null && value !== undefined) {
      cleanDocument[key] = value;
    }
  }

  // Save document
  await kv.hset(`document:${id}`, cleanDocument);

  // Add to documents set
  await kv.sadd('documents:ids', id);

  // If linked to ticket, add to ticket's documents
  if (data.ticketId) {
    await kv.sadd(`documents:ticket:${data.ticketId}`, id);
  }

  return document;
}

export async function getDocument(id: string): Promise<Document | null> {
  const document = await kv.hgetall(`document:${id}`);
  if (!document || Object.keys(document).length === 0) {
    return null;
  }
  return document as unknown as Document;
}

export async function updateDocument(
  id: string,
  updates: Partial<Omit<Document, 'id' | 'uploadedAt' | 'uploadedBy'>>
): Promise<Document | null> {
  const existing = await getDocument(id);
  if (!existing) {
    return null;
  }

  const updated = { ...existing, ...updates };

  // Filter out null/undefined values before saving to KV
  const cleanDocument: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updated)) {
    if (value !== null && value !== undefined) {
      cleanDocument[key] = value;
    }
  }

  await kv.hset(`document:${id}`, cleanDocument);

  return updated;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const document = await getDocument(id);
  if (!document) {
    return false;
  }

  // Remove from main set
  await kv.srem('documents:ids', id);

  // Remove from ticket set if linked
  if (document.ticketId) {
    await kv.srem(`documents:ticket:${document.ticketId}`, id);
  }

  // Remove search index entries
  if (document.ocrText) {
    await removeFromSearchIndex(id, document.ocrText);
  }

  // Delete document
  await kv.del(`document:${id}`);

  return true;
}

export async function listDocuments(options?: {
  ticketId?: string;
  ocrStatus?: Document['ocrStatus'];
  limit?: number;
  offset?: number;
}): Promise<{ documents: Document[]; total: number }> {
  let documentIds: string[];

  if (options?.ticketId) {
    documentIds = await kv.smembers(`documents:ticket:${options.ticketId}`) as string[];
  } else {
    documentIds = await kv.smembers('documents:ids') as string[];
  }

  // Filter by OCR status if specified
  let documents: Document[] = [];
  for (const id of documentIds) {
    const doc = await getDocument(id);
    if (doc) {
      if (!options?.ocrStatus || doc.ocrStatus === options.ocrStatus) {
        documents.push(doc);
      }
    }
  }

  // Sort by upload date (newest first)
  documents.sort((a, b) =>
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  const total = documents.length;

  // Apply pagination
  if (options?.offset !== undefined || options?.limit !== undefined) {
    const start = options.offset || 0;
    const end = options.limit ? start + options.limit : undefined;
    documents = documents.slice(start, end);
  }

  return { documents, total };
}

// OCR Status Management

export async function getDocumentsPendingOcr(limit: number = 10): Promise<Document[]> {
  const { documents } = await listDocuments({ ocrStatus: 'pending', limit });
  return documents;
}

export async function updateOcrStatus(
  id: string,
  status: Document['ocrStatus'],
  ocrText?: string,
  error?: string
): Promise<Document | null> {
  const updates: Partial<Document> = {
    ocrStatus: status,
    processedAt: new Date().toISOString(),
  };

  if (ocrText !== undefined) {
    updates.ocrText = ocrText;
    // Index the text for search
    await indexDocumentText(id, ocrText);
  }

  if (error !== undefined) {
    updates.ocrError = error;
  }

  return updateDocument(id, updates);
}

// Search Index Management

async function indexDocumentText(documentId: string, text: string): Promise<void> {
  // Extract keywords (words with 3+ characters)
  const words = text
    .toLowerCase()
    .replace(/[^\wäöüß\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3);

  // Get unique words
  const uniqueWords = [...new Set(words)];

  // Add document to search index for each word
  for (const word of uniqueWords.slice(0, 500)) { // Limit to 500 keywords
    await kv.sadd(`documents:search:${word}`, documentId);
  }

  // Store the full OCR text for display
  await kv.set(`documents:ocrtext:${documentId}`, text);
}

async function removeFromSearchIndex(documentId: string, text: string): Promise<void> {
  const words = text
    .toLowerCase()
    .replace(/[^\wäöüß\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 3);

  const uniqueWords = [...new Set(words)];

  for (const word of uniqueWords.slice(0, 500)) {
    await kv.srem(`documents:search:${word}`, documentId);
  }

  await kv.del(`documents:ocrtext:${documentId}`);
}

export async function searchDocuments(query: string): Promise<DocumentSearchResult[]> {
  const searchTerms = query
    .toLowerCase()
    .replace(/[^\wäöüß\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length >= 3);

  if (searchTerms.length === 0) {
    return [];
  }

  // Find documents matching each term
  const matchingSets: Set<string>[] = [];
  for (const term of searchTerms) {
    const matches = await kv.smembers(`documents:search:${term}`) as string[];
    matchingSets.push(new Set(matches));
  }

  // Find documents matching ALL terms (intersection)
  let matchingIds: Set<string>;
  if (matchingSets.length === 1) {
    matchingIds = matchingSets[0];
  } else {
    matchingIds = matchingSets.reduce((acc, set) => {
      return new Set([...acc].filter(id => set.has(id)));
    });
  }

  // Get documents and calculate scores
  const results: DocumentSearchResult[] = [];
  for (const id of matchingIds) {
    const document = await getDocument(id);
    if (document) {
      // Simple scoring: count term occurrences
      const ocrText = (document.ocrText || '').toLowerCase();
      let score = 0;
      let matchedText = '';

      for (const term of searchTerms) {
        const regex = new RegExp(term, 'gi');
        const matches = ocrText.match(regex);
        if (matches) {
          score += matches.length;
        }
      }

      // Extract a snippet with context
      if (document.ocrText) {
        const firstTermIndex = ocrText.indexOf(searchTerms[0]);
        if (firstTermIndex !== -1) {
          const start = Math.max(0, firstTermIndex - 50);
          const end = Math.min(document.ocrText.length, firstTermIndex + 150);
          matchedText = document.ocrText.substring(start, end);
          if (start > 0) matchedText = '...' + matchedText;
          if (end < document.ocrText.length) matchedText = matchedText + '...';
        }
      }

      results.push({ document, matchedText, score });
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

// Get documents by ticket
export async function getDocumentsByTicket(ticketId: string): Promise<Document[]> {
  const { documents } = await listDocuments({ ticketId });
  return documents;
}

// Link document to ticket
export async function linkDocumentToTicket(documentId: string, ticketId: string): Promise<boolean> {
  const document = await getDocument(documentId);
  if (!document) {
    return false;
  }

  // Update document
  await updateDocument(documentId, { ticketId });

  // Add to ticket's document set
  await kv.sadd(`documents:ticket:${ticketId}`, documentId);

  return true;
}

// Unlink document from ticket
export async function unlinkDocumentFromTicket(documentId: string): Promise<boolean> {
  const document = await getDocument(documentId);
  if (!document || !document.ticketId) {
    return false;
  }

  const ticketId = document.ticketId;

  // Update document
  await updateDocument(documentId, { ticketId: undefined });

  // Remove from ticket's document set
  await kv.srem(`documents:ticket:${ticketId}`, documentId);

  return true;
}

// Statistics
export async function getDocumentStats(): Promise<{
  total: number;
  pending: number;
  completed: number;
  failed: number;
  invoices: number;
}> {
  const { documents } = await listDocuments();

  return {
    total: documents.length,
    pending: documents.filter(d => d.ocrStatus === 'pending').length,
    completed: documents.filter(d => d.ocrStatus === 'completed').length,
    failed: documents.filter(d => d.ocrStatus === 'failed').length,
    invoices: documents.filter(d => d.isInvoice).length,
  };
}

// ==========================================
// FOLDER MANAGEMENT
// ==========================================

function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function createFolder(data: {
  name: string;
  parentId?: string;
}): Promise<Folder> {
  const id = generateFolderId();
  const now = new Date().toISOString();

  const folder: Folder = {
    id,
    name: data.name,
    createdAt: now,
    updatedAt: now,
  };

  if (data.parentId) {
    folder.parentId = data.parentId;
  }

  // Filter null/undefined before saving
  const cleanFolder: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(folder)) {
    if (value !== null && value !== undefined) {
      cleanFolder[key] = value;
    }
  }

  await kv.hset(`folder:${id}`, cleanFolder);
  await kv.sadd('folders:ids', id);

  if (data.parentId) {
    await kv.sadd(`folder:${data.parentId}:children`, id);
  } else {
    await kv.sadd('folders:root', id);
  }

  return folder;
}

export async function getFolder(id: string): Promise<Folder | null> {
  const folder = await kv.hgetall(`folder:${id}`);
  if (!folder || Object.keys(folder).length === 0) {
    return null;
  }
  return folder as unknown as Folder;
}

export async function updateFolder(id: string, updates: { name?: string }): Promise<Folder | null> {
  const existing = await getFolder(id);
  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const cleanFolder: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updated)) {
    if (value !== null && value !== undefined) {
      cleanFolder[key] = value;
    }
  }

  await kv.hset(`folder:${id}`, cleanFolder);
  return updated;
}

export async function deleteFolder(id: string): Promise<boolean> {
  const folder = await getFolder(id);
  if (!folder) {
    return false;
  }

  // Get all documents in this folder and move them to root
  const documentIds = await kv.smembers(`folder:${id}:documents`) as string[];
  for (const docId of documentIds) {
    await updateDocument(docId, { folderId: undefined });
  }

  // Get child folders and move them to root or parent
  const childIds = await kv.smembers(`folder:${id}:children`) as string[];
  for (const childId of childIds) {
    if (folder.parentId) {
      await kv.sadd(`folder:${folder.parentId}:children`, childId);
      await updateFolder(childId, {}); // Trigger update with parent
    } else {
      await kv.sadd('folders:root', childId);
    }
  }

  // Remove from parent or root
  if (folder.parentId) {
    await kv.srem(`folder:${folder.parentId}:children`, id);
  } else {
    await kv.srem('folders:root', id);
  }

  // Clean up
  await kv.del(`folder:${id}`);
  await kv.del(`folder:${id}:documents`);
  await kv.del(`folder:${id}:children`);
  await kv.srem('folders:ids', id);

  return true;
}

export async function listFolders(parentId?: string): Promise<Folder[]> {
  let folderIds: string[];

  if (parentId) {
    folderIds = await kv.smembers(`folder:${parentId}:children`) as string[];
  } else {
    folderIds = await kv.smembers('folders:root') as string[];
  }

  const folders: Folder[] = [];
  for (const id of folderIds) {
    const folder = await getFolder(id);
    if (folder) {
      folders.push(folder);
    }
  }

  // Sort alphabetically
  folders.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return folders;
}

export async function moveDocumentToFolder(documentId: string, folderId: string | null): Promise<boolean> {
  const document = await getDocument(documentId);
  if (!document) {
    return false;
  }

  // Remove from current folder
  if (document.folderId) {
    await kv.srem(`folder:${document.folderId}:documents`, documentId);
  }

  // Add to new folder or root
  if (folderId) {
    const folder = await getFolder(folderId);
    if (!folder) {
      return false;
    }
    await kv.sadd(`folder:${folderId}:documents`, documentId);
    await updateDocument(documentId, { folderId });
  } else {
    await updateDocument(documentId, { folderId: undefined });
  }

  return true;
}

export async function getDocumentsInFolder(folderId: string | null): Promise<Document[]> {
  if (folderId) {
    const documentIds = await kv.smembers(`folder:${folderId}:documents`) as string[];
    const documents: Document[] = [];
    for (const id of documentIds) {
      const doc = await getDocument(id);
      if (doc && !doc.isInvoice) {
        documents.push(doc);
      }
    }
    return documents.sort((a, b) =>
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  } else {
    // Root documents (no folder, not invoices)
    const { documents } = await listDocuments();
    return documents.filter(d => !d.folderId && !d.isInvoice);
  }
}

// ==========================================
// INVOICE MANAGEMENT
// ==========================================

export async function listInvoices(): Promise<Document[]> {
  const { documents } = await listDocuments();
  return documents.filter(d => d.isInvoice);
}

export async function getInvoicesByMonth(): Promise<Record<string, Document[]>> {
  const invoices = await listInvoices();
  const grouped: Record<string, Document[]> = {};

  for (const invoice of invoices) {
    // Use invoiceDate if available, otherwise uploadedAt
    const dateStr = invoice.invoiceDate || invoice.uploadedAt;
    const date = new Date(dateStr);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!grouped[monthKey]) {
      grouped[monthKey] = [];
    }
    grouped[monthKey].push(invoice);
  }

  // Sort invoices within each month by date (newest first)
  for (const month of Object.keys(grouped)) {
    grouped[month].sort((a, b) => {
      const dateA = new Date(a.invoiceDate || a.uploadedAt);
      const dateB = new Date(b.invoiceDate || b.uploadedAt);
      return dateB.getTime() - dateA.getTime();
    });
  }

  return grouped;
}

export async function markAsInvoice(
  documentId: string,
  invoiceData: {
    invoiceDate?: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    invoiceVendor?: string;
  }
): Promise<Document | null> {
  return updateDocument(documentId, {
    isInvoice: true,
    ...invoiceData,
  });
}

export async function unmarkAsInvoice(documentId: string): Promise<Document | null> {
  const doc = await getDocument(documentId);
  if (!doc) return null;

  // We need to remove invoice fields - but KV doesn't support removing fields
  // So we'll set them to undefined and filter on save
  return updateDocument(documentId, {
    isInvoice: false,
    invoiceDate: undefined,
    invoiceNumber: undefined,
    invoiceAmount: undefined,
    invoiceVendor: undefined,
  });
}
