import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

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

// Get knowledge context for AI (summarized)
export async function getKnowledgeContext(): Promise<string> {
  const entries = await getAllKnowledgeEntries();
  
  if (entries.length === 0) {
    return 'Keine Unternehmensinformationen verfügbar.';
  }

  const context = entries.map(entry => {
    const preview = entry.content.substring(0, 500);
    return `### ${entry.title}\nURL: ${entry.url}\n${entry.description || preview}...`;
  }).join('\n\n');

  return `# Unternehmensinformationen\n\n${context}`;
}
