import { put, del, list } from '@vercel/blob';

const IMAGES_PREFIX = 'fitinn-images/';

export async function uploadImage(
  filename: string,
  data: Buffer,
  contentType: string
): Promise<string> {
  const path = `${IMAGES_PREFIX}${filename}`;

  const blob = await put(path, data, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });

  return blob.url;
}

export async function deleteImage(blobUrl: string): Promise<void> {
  try {
    await del(blobUrl);
  } catch (error) {
    console.error('Error deleting image from blob:', error);
    throw error;
  }
}

export async function listImages(): Promise<{ url: string; pathname: string }[]> {
  try {
    const { blobs } = await list({ prefix: IMAGES_PREFIX });
    return blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
    }));
  } catch (error) {
    console.error('Error listing images from blob:', error);
    return [];
  }
}

export function getContentType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}

export function validateImageFile(filename: string, size: number): { valid: boolean; error?: string } {
  const ext = filename.toLowerCase().split('.').pop();
  if (!['jpg', 'jpeg', 'png'].includes(ext || '')) {
    return { valid: false, error: 'Nur JPG und PNG erlaubt' };
  }

  const maxSize = 10 * 1024 * 1024;
  if (size > maxSize) {
    return { valid: false, error: 'Bild zu gross (max 10MB)' };
  }

  return { valid: true };
}
