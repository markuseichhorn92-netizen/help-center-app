import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/dashboard/auth';
import { getImages, addImage } from '@/lib/dashboard/kv';
import { ImageInfo } from '@/lib/dashboard/config';
import { put } from '@vercel/blob';

// POST /api/dashboard/upload-image - Upload compressed image
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    // Check image limit (max 10 images)
    const images = await getImages();
    if (images.length >= 10) {
      return NextResponse.json({ error: 'Maximal 10 Bilder erlaubt' }, { status: 400 });
    }

    const body = await request.json();

    // Extract base64 data
    let base64Data = body.data as string;
    if (!base64Data) {
      return NextResponse.json({ error: 'Keine Bilddaten' }, { status: 400 });
    }

    // Remove data URL prefix
    if (base64Data.startsWith('data:image/')) {
      base64Data = base64Data.replace(/^data:image\/\w+;base64,/, '');
    }

    // Decode base64
    const buffer = Buffer.from(base64Data, 'base64');

    // Check size (should be under 4MB after compression)
    if (buffer.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: 'Bild zu gross nach Komprimierung' }, { status: 400 });
    }

    // Get filename
    let filename = (body.filename as string) || `image_${Date.now()}.jpg`;
    filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Check for duplicate
    if (images.some(img => img.name === filename)) {
      const ext = filename.split('.').pop() || 'jpg';
      const baseName = filename.replace(/\.\w+$/, '');
      filename = `${baseName}_${Date.now()}.${ext}`;
    }

    // Upload to Vercel Blob
    const blob = await put(`fitinn-images/${filename}`, buffer, {
      access: 'public',
      contentType: 'image/jpeg',
    });

    // Save to KV
    const imageInfo: ImageInfo = {
      name: filename,
      blobUrl: blob.url,
      uploadedAt: new Date().toISOString(),
      size: buffer.length,
    };
    await addImage(imageInfo);

    return NextResponse.json({ success: true, filename, url: blob.url });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Upload fehlgeschlagen' }, { status: 500 });
  }
}
