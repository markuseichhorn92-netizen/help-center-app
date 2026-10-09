import { NextRequest, NextResponse } from 'next/server';
import { markMessagesAsRead } from '@/lib/tickets';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await req.json();
    const { messageIds } = body;

    // Mark messages as read (if messageIds provided, mark only those; otherwise mark all customer messages)
    await markMessagesAsRead(id, messageIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to mark messages as read:', error);
    return NextResponse.json({ message: 'Fehler beim Markieren der Nachrichten.' }, { status: 500 });
  }
}
