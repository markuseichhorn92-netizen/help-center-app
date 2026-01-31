import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@vercel/kv';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export async function POST(req: NextRequest) {
  // Check admin session
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
