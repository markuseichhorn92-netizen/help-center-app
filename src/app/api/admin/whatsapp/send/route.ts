import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { to, message, ticketNumber, messageId, attachments } = body;

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: "Missing 'to' or 'message'" },
        { status: 400 }
      );
    }

    const result = await sendWhatsAppMessage({
      to,
      message,
      ticketNumber,
      messageId,
      attachments,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error sending WhatsApp:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
