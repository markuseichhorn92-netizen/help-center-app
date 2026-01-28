import { NextRequest, NextResponse } from 'next/server';
import { getFolder, updateFolder, deleteFolder } from '@/lib/documents';

// GET: Get single folder
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const folder = await getFolder(id);

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error: unknown) {
    console.error('Get folder error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// PUT: Update folder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name } = body;

    const folder = await updateFolder(id, { name });

    if (!folder) {
      return NextResponse.json({ error: 'Ordner nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error: unknown) {
    console.error('Update folder error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Fehler beim Aktualisieren.',
    }, { status: 500 });
  }
}

// DELETE: Delete folder
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const success = await deleteFolder(id);

    if (!success) {
      return NextResponse.json({ error: 'Ordner nicht gefunden.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete folder error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Fehler beim Löschen.',
    }, { status: 500 });
  }
}
