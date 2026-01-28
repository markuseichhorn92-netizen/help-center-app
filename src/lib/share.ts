import { createClient } from '@vercel/kv';
import { getDocument, Document } from './documents';
import crypto from 'crypto';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface ShareLink {
  token: string;
  documentId: string;
  createdAt: string;
  expiresAt?: string;
  hasPassword: boolean;
  accessCount: number;
  createdBy: string;
}

interface ShareLinkData extends ShareLink {
  passwordHash?: string;
}

// Bulk share link for multiple documents
export interface BulkShareLink {
  token: string;
  documentIds: string[];
  createdAt: string;
  expiresAt?: string;
  hasPassword: boolean;
  accessCount: number;
  createdBy: string;
  title?: string;
}

interface BulkShareLinkData extends BulkShareLink {
  passwordHash?: string;
}

// Generate a secure random token
function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

// Hash password with SHA-256
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Create a share link for a document
export async function createShareLink(
  documentId: string,
  options: {
    expiresAt?: string;
    password?: string;
    createdBy?: string;
  } = {}
): Promise<ShareLink> {
  const document = await getDocument(documentId);
  if (!document) {
    throw new Error('Dokument nicht gefunden');
  }

  const token = generateToken();
  const now = new Date().toISOString();

  const shareData: ShareLinkData = {
    token,
    documentId,
    createdAt: now,
    hasPassword: !!options.password,
    accessCount: 0,
    createdBy: options.createdBy || 'admin',
  };

  if (options.expiresAt) {
    shareData.expiresAt = options.expiresAt;
  }

  if (options.password) {
    shareData.passwordHash = hashPassword(options.password);
  }

  // Save share link
  await kv.hset(`share:${token}`, shareData as unknown as Record<string, unknown>);

  // Add to document's shares set
  await kv.sadd(`document:${documentId}:shares`, token);

  return {
    token: shareData.token,
    documentId: shareData.documentId,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt,
    hasPassword: shareData.hasPassword,
    accessCount: shareData.accessCount,
    createdBy: shareData.createdBy,
  };
}

// Get a share link by token
export async function getShareLink(token: string): Promise<ShareLink | null> {
  const data = await kv.hgetall(`share:${token}`);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const shareData = data as unknown as ShareLinkData;
  return {
    token: shareData.token,
    documentId: shareData.documentId,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt,
    hasPassword: shareData.hasPassword,
    accessCount: shareData.accessCount,
    createdBy: shareData.createdBy,
  };
}

// Validate share access and return document if valid
export async function validateShareAccess(
  token: string,
  password?: string
): Promise<{ valid: boolean; document?: Document; error?: string }> {
  const data = await kv.hgetall(`share:${token}`);
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: 'Link nicht gefunden' };
  }

  const shareData = data as unknown as ShareLinkData;

  // Check expiration
  if (shareData.expiresAt) {
    const expiresAt = new Date(shareData.expiresAt);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'Link ist abgelaufen' };
    }
  }

  // Check password
  if (shareData.hasPassword) {
    if (!password) {
      return { valid: false, error: 'Passwort erforderlich' };
    }
    const passwordHash = hashPassword(password);
    if (passwordHash !== shareData.passwordHash) {
      return { valid: false, error: 'Falsches Passwort' };
    }
  }

  // Get document
  const document = await getDocument(shareData.documentId);
  if (!document) {
    return { valid: false, error: 'Dokument nicht mehr verfügbar' };
  }

  // Increment access count
  await kv.hincrby(`share:${token}`, 'accessCount', 1);

  return { valid: true, document };
}

// Delete a share link
export async function deleteShareLink(token: string): Promise<boolean> {
  const shareLink = await getShareLink(token);
  if (!shareLink) {
    return false;
  }

  // Remove from document's shares set
  await kv.srem(`document:${shareLink.documentId}:shares`, token);

  // Delete share link
  await kv.del(`share:${token}`);

  return true;
}

// Get all share links for a document
export async function getShareLinksForDocument(documentId: string): Promise<ShareLink[]> {
  const tokens = await kv.smembers(`document:${documentId}:shares`);
  if (!tokens || tokens.length === 0) {
    return [];
  }

  const shareLinks: ShareLink[] = [];
  for (const token of tokens) {
    const shareLink = await getShareLink(token as string);
    if (shareLink) {
      shareLinks.push(shareLink);
    }
  }

  // Sort by creation date (newest first)
  shareLinks.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return shareLinks;
}

// Delete all share links for a document (used when document is deleted)
export async function deleteAllShareLinksForDocument(documentId: string): Promise<void> {
  const tokens = await kv.smembers(`document:${documentId}:shares`);
  if (!tokens || tokens.length === 0) {
    return;
  }

  for (const token of tokens) {
    await kv.del(`share:${token}`);
  }

  await kv.del(`document:${documentId}:shares`);
}

// ==================== BULK SHARE FUNCTIONS ====================

// Create a bulk share link for multiple documents
export async function createBulkShareLink(
  documentIds: string[],
  options: {
    expiresAt?: string;
    password?: string;
    createdBy?: string;
    title?: string;
  } = {}
): Promise<BulkShareLink> {
  if (!documentIds || documentIds.length === 0) {
    throw new Error('Mindestens ein Dokument erforderlich');
  }

  // Verify all documents exist
  const documents = await Promise.all(documentIds.map(id => getDocument(id)));
  const missingDocs = documents.filter(d => !d);
  if (missingDocs.length > 0) {
    throw new Error(`${missingDocs.length} Dokument(e) nicht gefunden`);
  }

  const token = generateToken();
  const now = new Date().toISOString();

  const shareData: BulkShareLinkData = {
    token,
    documentIds,
    createdAt: now,
    hasPassword: !!options.password,
    accessCount: 0,
    createdBy: options.createdBy || 'admin',
  };

  if (options.expiresAt) {
    shareData.expiresAt = options.expiresAt;
  }

  if (options.password) {
    shareData.passwordHash = hashPassword(options.password);
  }

  if (options.title) {
    shareData.title = options.title;
  }

  // Save bulk share link with documentIds as JSON string
  await kv.hset(`bulkshare:${token}`, {
    ...shareData,
    documentIds: JSON.stringify(documentIds),
  } as unknown as Record<string, unknown>);

  // Add to global bulk shares set
  await kv.sadd('bulkshares:ids', token);

  return {
    token: shareData.token,
    documentIds: shareData.documentIds,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt,
    hasPassword: shareData.hasPassword,
    accessCount: shareData.accessCount,
    createdBy: shareData.createdBy,
    title: shareData.title,
  };
}

// Get a bulk share link by token
export async function getBulkShareLink(token: string): Promise<BulkShareLink | null> {
  const data = await kv.hgetall(`bulkshare:${token}`);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }

  const shareData = data as unknown as BulkShareLinkData & { documentIds: string };

  // Parse documentIds from JSON string
  let documentIds: string[];
  try {
    documentIds = typeof shareData.documentIds === 'string'
      ? JSON.parse(shareData.documentIds)
      : shareData.documentIds;
  } catch {
    documentIds = [];
  }

  return {
    token: shareData.token,
    documentIds,
    createdAt: shareData.createdAt,
    expiresAt: shareData.expiresAt,
    hasPassword: shareData.hasPassword,
    accessCount: shareData.accessCount,
    createdBy: shareData.createdBy,
    title: shareData.title,
  };
}

// Validate bulk share access and return documents if valid
export async function validateBulkShareAccess(
  token: string,
  password?: string
): Promise<{ valid: boolean; documents?: Document[]; title?: string; error?: string }> {
  const data = await kv.hgetall(`bulkshare:${token}`);
  if (!data || Object.keys(data).length === 0) {
    return { valid: false, error: 'Link nicht gefunden' };
  }

  const shareData = data as unknown as BulkShareLinkData & { documentIds: string };

  // Check expiration
  if (shareData.expiresAt) {
    const expiresAt = new Date(shareData.expiresAt);
    if (expiresAt < new Date()) {
      return { valid: false, error: 'Link ist abgelaufen' };
    }
  }

  // Check password
  if (shareData.hasPassword) {
    if (!password) {
      return { valid: false, error: 'Passwort erforderlich' };
    }
    const passwordHash = hashPassword(password);
    if (passwordHash !== shareData.passwordHash) {
      return { valid: false, error: 'Falsches Passwort' };
    }
  }

  // Parse documentIds
  let documentIds: string[];
  try {
    documentIds = typeof shareData.documentIds === 'string'
      ? JSON.parse(shareData.documentIds)
      : shareData.documentIds;
  } catch {
    return { valid: false, error: 'Ungültige Dokumentenliste' };
  }

  // Get all documents
  const documents = await Promise.all(documentIds.map(id => getDocument(id)));
  const validDocuments = documents.filter((d): d is Document => d !== null);

  if (validDocuments.length === 0) {
    return { valid: false, error: 'Keine Dokumente mehr verfügbar' };
  }

  // Increment access count
  await kv.hincrby(`bulkshare:${token}`, 'accessCount', 1);

  return { valid: true, documents: validDocuments, title: shareData.title };
}

// Delete a bulk share link
export async function deleteBulkShareLink(token: string): Promise<boolean> {
  const shareLink = await getBulkShareLink(token);
  if (!shareLink) {
    return false;
  }

  // Remove from global set
  await kv.srem('bulkshares:ids', token);

  // Delete bulk share link
  await kv.del(`bulkshare:${token}`);

  return true;
}
