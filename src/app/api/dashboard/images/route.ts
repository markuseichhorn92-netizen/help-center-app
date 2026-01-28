import { NextRequest, NextResponse } from 'next/server';
import { getImages, updateImageOrder } from '@/lib/dashboard/kv';
import { requireAuth } from '@/lib/dashboard/auth';

// Disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/dashboard/images - List all images
export async function GET() {
  try {
    const images = await getImages();

    const imageList = images.map(img => ({
      name: img.name,
      url: img.blobUrl,
      uploadedAt: img.uploadedAt,
      size: img.size,
      order: img.order || 0,
    }));

    return NextResponse.json(
      { images: imageList },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error getting images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/dashboard/images - Update image order
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 });
    }

    await updateImageOrder(orders);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating image order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
