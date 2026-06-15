import { kv } from './kv';

export interface KnowledgeEntry {
  id: string;
  url: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string[];
  lastCrawled: string;
  createdAt: string;
}

// Save knowledge entry
export async function saveKnowledgeEntry(data: {
  url: string;
  title: string;
  content: string;
  description?: string;
  keywords?: string[];
}): Promise<KnowledgeEntry> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const entry: KnowledgeEntry = {
    id,
    url: data.url,
    title: data.title,
    content: data.content,
    description: data.description,
    keywords: data.keywords || [],
    lastCrawled: now,
    createdAt: now,
  };

  // Filter out undefined/null values
  const entryForKV = Object.fromEntries(
    Object.entries(entry).filter(([_, v]) => v != null)
  );

  await kv.hmset(`knowledge:${id}`, entryForKV);
  await kv.sadd('knowledge:ids', id);
  
  // Index by URL for quick lookup
  await kv.set(`knowledge:url:${encodeURIComponent(data.url)}`, id);

  return entry;
}

// Update existing knowledge entry
export async function updateKnowledgeEntry(
  url: string,
  data: {
    title: string;
    content: string;
    description?: string;
    keywords?: string[];
  }
): Promise<KnowledgeEntry | null> {
  const entryId = await kv.get<string>(`knowledge:url:${encodeURIComponent(url)}`);
  
  if (!entryId) {
    return null;
  }

  const now = new Date().toISOString();
  const updates = {
    title: data.title,
    content: data.content,
    description: data.description,
    keywords: data.keywords || [],
    lastCrawled: now,
  };

  const updatesForKV = Object.fromEntries(
    Object.entries(updates).filter(([_, v]) => v != null)
  );

  await kv.hmset(`knowledge:${entryId}`, updatesForKV);

  const entry = await kv.hgetall(`knowledge:${entryId}`);
  return entry as unknown as KnowledgeEntry;
}

// Get all knowledge entries
export async function getAllKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  const entryIds: string[] = await kv.smembers('knowledge:ids');
  if (entryIds.length === 0) {
    return [];
  }

  const entries = await Promise.all(
    entryIds.map(async (id) => {
      const entry = await kv.hgetall(`knowledge:${id}`);
      return entry as unknown as KnowledgeEntry;
    })
  );

  return entries
    .filter((e): e is KnowledgeEntry => e !== null && Object.keys(e).length > 0)
    .sort((a, b) => new Date(b.lastCrawled).getTime() - new Date(a.lastCrawled).getTime());
}

// Get knowledge entry by URL
export async function getKnowledgeEntryByUrl(url: string): Promise<KnowledgeEntry | null> {
  const entryId = await kv.get<string>(`knowledge:url:${encodeURIComponent(url)}`);

  if (!entryId) {
    return null;
  }

  const entry = await kv.hgetall(`knowledge:${entryId}`);
  return entry as unknown as KnowledgeEntry;
}

// Get knowledge entry by ID
export async function getKnowledgeEntryById(id: string): Promise<KnowledgeEntry | null> {
  const entry = await kv.hgetall(`knowledge:${id}`);
  if (!entry || Object.keys(entry).length === 0) {
    return null;
  }
  return entry as unknown as KnowledgeEntry;
}

// Update knowledge entry by ID
export async function updateKnowledgeEntryById(
  id: string,
  data: {
    title?: string;
    content?: string;
    description?: string;
    keywords?: string[];
  }
): Promise<KnowledgeEntry | null> {
  const existingEntry = await getKnowledgeEntryById(id);
  if (!existingEntry) {
    return null;
  }

  const now = new Date().toISOString();
  const updates: Record<string, string | string[]> = {
    lastCrawled: now,
  };

  if (data.title !== undefined) updates.title = data.title;
  if (data.content !== undefined) updates.content = data.content;
  if (data.description !== undefined) updates.description = data.description;
  if (data.keywords !== undefined) updates.keywords = data.keywords;

  await kv.hmset(`knowledge:${id}`, updates);

  const entry = await kv.hgetall(`knowledge:${id}`);
  return entry as unknown as KnowledgeEntry;
}

// Delete knowledge entry
export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  const entry = await kv.hgetall(`knowledge:${id}`) as unknown as KnowledgeEntry;
  
  if (!entry) {
    return false;
  }

  await Promise.all([
    kv.del(`knowledge:${id}`),
    kv.srem('knowledge:ids', id),
    kv.del(`knowledge:url:${encodeURIComponent(entry.url)}`),
  ]);

  return true;
}

// Search knowledge base
export async function searchKnowledge(query: string): Promise<KnowledgeEntry[]> {
  const allEntries = await getAllKnowledgeEntries();
  const lowerQuery = query.toLowerCase();

  return allEntries.filter(entry => {
    return (
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.content.toLowerCase().includes(lowerQuery) ||
      entry.description?.toLowerCase().includes(lowerQuery) ||
      entry.keywords?.some(k => k.toLowerCase().includes(lowerQuery))
    );
  });
}

// Get knowledge context for AI (full content for accurate responses)
export async function getKnowledgeContext(): Promise<string> {
  const entries = await getAllKnowledgeEntries();

  if (entries.length === 0) {
    return 'Keine Unternehmensinformationen verfügbar.';
  }

  // Include full content for each entry (max 8000 chars per entry to stay within token limits)
  const maxContentLength = 8000;

  const context = entries.map(entry => {
    // Use full content, truncate only if very long
    const content = entry.content.length > maxContentLength
      ? entry.content.substring(0, maxContentLength) + '...[gekürzt]'
      : entry.content;

    // Include both description and full content
    const parts = [
      `### ${entry.title}`,
      `URL: ${entry.url}`,
    ];

    if (entry.description) {
      parts.push(`Beschreibung: ${entry.description}`);
    }

    if (entry.keywords && entry.keywords.length > 0) {
      parts.push(`Keywords: ${entry.keywords.join(', ')}`);
    }

    parts.push(`\nInhalt:\n${content}`);

    return parts.join('\n');
  }).join('\n\n---\n\n');

  return `# Unternehmensinformationen aus der FIT INN Website

WICHTIG: Die folgenden Informationen stammen direkt von der offiziellen FIT INN Website. Nutze diese Informationen als primäre Quelle für alle Antworten. Erfinde KEINE Informationen, die nicht in diesem Kontext enthalten sind. Wenn du eine Information nicht findest, sage ehrlich dass du keine genauen Informationen dazu hast.

${context}`;
}
