import { NextRequest, NextResponse } from 'next/server';
import { createFolder, listFolders } from '@/lib/documents';
import { requireAdmin } from '@/lib/admin-auth';

// GET: List folders
export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId') || undefined;

    const folders = await listFolders(parentId);

    return NextResponse.json({ folders });
  } catch (error: unknown) {
    console.error('Folders list error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST: Create folder
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { name, parentId } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name ist erforderlich.' }, { status: 400 });
    }

    const folder = await createFolder({
      name: name.trim(),
      parentId: parentId || undefined,
    });

    return NextResponse.json(folder);
  } catch (error: unknown) {
    console.error('Create folder error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Fehler beim Erstellen.',
    }, { status: 500 });
  }
}
