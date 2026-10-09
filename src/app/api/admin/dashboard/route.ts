import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@/lib/kv';
import { requireAdmin } from '@/lib/admin-auth';

// GET /api/admin/dashboard - Get dashboard statistics
export async function GET(req: NextRequest) {
  // Check session cookie
  const denied = await requireAdmin(req);
  if (denied) return denied;

  try {
    // Get all ticket IDs
    const ticketIds = await kv.smembers('tickets:ids');

    // Get all tickets with their data
    const tickets = await Promise.all(
      ticketIds.map(async (id) => {
        const ticket = await kv.hgetall(`ticket:${id}`);
        if (!ticket) return null;

        // Get message IDs for this ticket
        const messageIds = await kv.smembers(`ticket:${id}:messages`);
        
        // Get the set of read message IDs
        const readMessageIds = await kv.smembers(`ticket:${id}:read`);
        const readSet = new Set(readMessageIds);

        // Count unread messages (from customer, not in read set)
        let unreadCount = 0;
        for (const msgId of messageIds) {
          const msg = await kv.hgetall(`message:${msgId}`);
          if (msg && msg.sender === 'customer' && !readSet.has(msgId as string)) {
            unreadCount++;
          }
        }

        return { ...ticket, id, unreadCount, messageCount: messageIds.length };
      })
    );

    const validTickets = tickets.filter(Boolean) as any[];

    // Only count active tickets (not closed/resolved) for unread messages
    const activeTickets = validTickets.filter(t => t.status === 'open' || t.status === 'in_progress');

    // Ticket stats
    const ticketStats = {
      total: validTickets.length,
      open: validTickets.filter(t => t.status === 'open').length,
      inProgress: validTickets.filter(t => t.status === 'in_progress').length,
      resolved: validTickets.filter(t => t.status === 'resolved').length,
      closed: validTickets.filter(t => t.status === 'closed').length,
      // Only count unread messages from active tickets
      unreadMessages: activeTickets.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
    };

    // Get recent tickets with unread messages (only active tickets)
    const ticketsWithUnread = activeTickets
      .filter(t => (t.unreadCount || 0) > 0)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    // Get article IDs
    const articleIds = await kv.smembers('articles:ids');

    // Get all articles
    const articles = await Promise.all(
      articleIds.map(async (id) => {
        const article = await kv.hgetall(`article:${id}`);
        if (!article) return null;

        // Get view count
        const views = await kv.get(`article:${id}:views:total`) || 0;

        return { ...article, id, views: Number(views) };
      })
    );

    const validArticles = articles.filter(Boolean) as any[];

    // Article stats
    const articleStats = {
      total: validArticles.length,
      published: validArticles.filter(a => a.published === true || a.published === 'true').length,
      draft: validArticles.filter(a => a.published === false || a.published === 'false').length,
      totalViews: validArticles.reduce((sum, a) => sum + (a.views || 0), 0),
    };

    // Get top 5 articles by views
    const topArticles = [...validArticles]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        views: a.views || 0,
        published: a.published === true || a.published === 'true',
      }));

    // Get contact IDs
    const contactIds = await kv.smembers('contacts:ids');

    // Get contact stats
    const contactStats = {
      total: contactIds.length,
    };

    // Get recent contacts
    const contacts = await Promise.all(
      contactIds.map(async (id) => {
        const contact = await kv.hgetall(`contact:${id}`);
        if (!contact) return null;
        return { ...contact, id };
      })
    );

    const validContacts = contacts.filter(Boolean) as any[];
    const recentContacts = [...validContacts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
      }));

    // Get today's date for analytics
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calculate today's views (sum across all articles)
    let todayViews = 0;
    let yesterdayViews = 0;
    for (const article of validArticles) {
      const todayCount = await kv.zscore(`article:${article.id}:views:daily`, today);
      const yesterdayCount = await kv.zscore(`article:${article.id}:views:daily`, yesterday);
      todayViews += Number(todayCount || 0);
      yesterdayViews += Number(yesterdayCount || 0);
    }

    return NextResponse.json({
      tickets: ticketStats,
      articles: articleStats,
      contacts: contactStats,
      ticketsWithUnread,
      topArticles,
      recentContacts,
      analytics: {
        todayViews,
        yesterdayViews,
        viewsTrend: yesterdayViews > 0 ? Math.round(((todayViews - yesterdayViews) / yesterdayViews) * 100) : 0,
      },
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Dashboard-Daten' },
      { status: 500 }
    );
  }
}
