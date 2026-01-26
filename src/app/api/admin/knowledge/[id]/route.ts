import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeEntryById, updateKnowledgeEntryById } from '@/lib/knowledge-base';

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

// GET - Get single knowledge entry
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

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
  if (!isAuthenticated(req)) {
    return new NextResponse('Authentication Required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }

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
