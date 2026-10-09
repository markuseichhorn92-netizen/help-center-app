import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeEntryById, updateKnowledgeEntryById } from '@/lib/knowledge-base';
import { requireAdmin } from '@/lib/admin-auth';

// GET - Get single knowledge entry
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const entry = await getKnowledgeEntryById(id);

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('Failed to get knowledge entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update knowledge entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await req.json();
    const { title, content, description, keywords } = body;

    const entry = await updateKnowledgeEntryById(id, {
      title,
      content,
      description,
      keywords,
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry, message: 'Entry updated successfully' });
  } catch (error: any) {
    console.error('Failed to update knowledge entry:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
