import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/dashboard/auth';
import { removeImage } from '@/lib/dashboard/kv';
import { deleteImage } from '@/lib/dashboard/blob';

// POST /api/dashboard/delete-image - Delete image (requires auth)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const filename = body.filename as string;

    if (!filename) {
      return NextResponse.json({ error: 'Dateiname fehlt' }, { status: 400 });
    }

    // Remove from KV and get blob URL
    const removed = await removeImage(filename);
    if (!removed) {
      return NextResponse.json({ error: 'Bild nicht gefunden' }, { status: 404 });
    }

    // Delete from Vercel Blob
    try {
      await deleteImage(removed.blobUrl);
    } catch (error) {
      console.error('Error deleting from blob (continuing anyway):', error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Loeschen fehlgeschlagen' }, { status: 500 });
  }
}
