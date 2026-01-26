import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'Keine Datei hochgeladen.' }, { status: 400 });
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'Datei zu groß (max. 10MB).' }, { status: 400 });
    }

    const blob = await put(`attachments/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    });

    return NextResponse.json({
      id: crypto.randomUUID(),
      filename: file.name,
      url: blob.url,
      size: file.size,
      contentType: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: 'Fehler beim Hochladen.' }, { status: 500 });
  }
}
