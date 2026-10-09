import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  // Check admin session
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    const imapUser = process.env.IMAP_USER || 'info@fit-inn-trier.de';
    
    // Find and delete all email:processed keys for this mailbox
    let cursor: string | number = 0;
    let deletedCount = 0;
    const pattern = `email:processed:${imapUser}:*`;
    
    do {
      const result = await kv.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0] as string | number;
      const keys = result[1] as string[];
      
      if (keys.length > 0) {
        for (const key of keys) {
          await kv.del(key);
          deletedCount++;
        }
      }
    } while (cursor !== 0 && cursor !== '0');

    return NextResponse.json({
      success: true,
      message: `Email-Cache geleert: ${deletedCount} Einträge gelöscht`,
      deletedCount,
      mailbox: imapUser,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Reset email cache error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
