import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// Helper function to check authentication
function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth) {
    return false;
  }
  const authValue = basicAuth.split(' ')[1];
  const [user, password] = Buffer.from(authValue, 'base64').toString().split(':');

  const ADMIN_USER = process.env.ADMIN_USER;
  const ADMIN_PASS = process.env.ADMIN_PASS;

  return user === ADMIN_USER && password === ADMIN_PASS;
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
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
