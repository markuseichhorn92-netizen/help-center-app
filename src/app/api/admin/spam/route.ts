import { NextRequest, NextResponse } from 'next/server';
import {
  getBlockedEmails,
  getBlockedDomains,
  addEmailToBlocklist,
  addDomainToBlocklist,
  removeEmailFromBlocklist,
  removeDomainFromBlocklist,
  getSpamStats,
} from '@/lib/spam-protection';

// GET: Get spam statistics and blocklists
export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const includeStats = searchParams.get('includeStats') === 'true';

    const [blockedEmails, blockedDomains] = await Promise.all([
      getBlockedEmails(),
      getBlockedDomains(),
    ]);

    const response: {
      blockedEmails: string[];
      blockedDomains: string[];
      stats?: Awaited<ReturnType<typeof getSpamStats>>;
    } = {
      blockedEmails,
      blockedDomains,
    };

    if (includeStats) {
      response.stats = await getSpamStats();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Spam config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// POST: Add to blocklist
export async function POST(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, value } = body;

    if (!type || !value) {
      return NextResponse.json(
        { error: 'type und value sind erforderlich' },
        { status: 400 }
      );
    }

    if (type === 'email') {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return NextResponse.json(
          { error: 'Ungültiges E-Mail-Format' },
          { status: 400 }
        );
      }
      await addEmailToBlocklist(value);
    } else if (type === 'domain') {
      // Validate domain format
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
      if (!domainRegex.test(value)) {
        return NextResponse.json(
          { error: 'Ungültiges Domain-Format' },
          { status: 400 }
        );
      }
      await addDomainToBlocklist(value);
    } else {
      return NextResponse.json(
        { error: 'type muss "email" oder "domain" sein' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add to blocklist error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}

// DELETE: Remove from blocklist
export async function DELETE(req: NextRequest) {
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const value = searchParams.get('value');

    if (!type || !value) {
      return NextResponse.json(
        { error: 'type und value sind erforderlich' },
        { status: 400 }
      );
    }

    if (type === 'email') {
      await removeEmailFromBlocklist(value);
    } else if (type === 'domain') {
      await removeDomainFromBlocklist(value);
    } else {
      return NextResponse.json(
        { error: 'type muss "email" oder "domain" sein' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove from blocklist error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unbekannter Fehler' },
      { status: 500 }
    );
  }
}
