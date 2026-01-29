import { NextRequest, NextResponse } from 'next/server';
import { getAllTickets } from '@/lib/tickets';

interface TicketVolumeData {
  date: string;
  count: number;
  open: number;
  resolved: number;
}

interface TicketStats {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  avgResolutionTimeHours: number | null;
  ticketsByDay: TicketVolumeData[];
  ticketsByStatus: { status: string; count: number }[];
  ticketsByChannel: { channel: string; count: number }[];
}

// GET: Get ticket statistics
export async function GET(req: NextRequest) {
  // Check authentication
  const sessionCookie = req.cookies.get('admin_session');
  if (!sessionCookie?.value) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Get all tickets (excluding trash)
    const allTickets = await getAllTickets();
    const tickets = allTickets.filter(t => !t.deletedAt && !t.isSpam);

    // Calculate date range
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Initialize daily counts
    const dailyCounts: Map<string, { count: number; open: number; resolved: number }> = new Map();
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyCounts.set(dateStr, { count: 0, open: 0, resolved: 0 });
    }

    // Count by status
    const statusCounts = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    const channelCounts: Map<string, number> = new Map();

    // Calculate resolution times
    const resolutionTimes: number[] = [];

    for (const ticket of tickets) {
      // Status counts
      statusCounts[ticket.status as keyof typeof statusCounts]++;

      // Channel counts
      const channel = ticket.channel || 'web';
      channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);

      // Daily counts
      const createdDate = new Date(ticket.createdAt);
      const dateStr = createdDate.toISOString().split('T')[0];
      
      if (dailyCounts.has(dateStr)) {
        const current = dailyCounts.get(dateStr)!;
        current.count++;
        if (ticket.status === 'open') current.open++;
        if (ticket.status === 'resolved' || ticket.status === 'closed') current.resolved++;
      }

      // Resolution time (for resolved/closed tickets)
      if ((ticket.status === 'resolved' || ticket.status === 'closed') && ticket.resolvedAt) {
        const created = new Date(ticket.createdAt).getTime();
        const resolved = new Date(ticket.resolvedAt).getTime();
        const hours = (resolved - created) / (1000 * 60 * 60);
        if (hours > 0 && hours < 720) { // Max 30 days
          resolutionTimes.push(hours);
        }
      }
    }

    // Convert to arrays
    const ticketsByDay: TicketVolumeData[] = Array.from(dailyCounts.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        open: data.open,
        resolved: data.resolved,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const ticketsByStatus = [
      { status: 'Offen', count: statusCounts.open },
      { status: 'In Bearbeitung', count: statusCounts.in_progress },
      { status: 'Gelöst', count: statusCounts.resolved },
      { status: 'Geschlossen', count: statusCounts.closed },
    ];

    const ticketsByChannel = Array.from(channelCounts.entries())
      .map(([channel, count]) => ({
        channel: channel === 'email' ? 'E-Mail' : channel === 'whatsapp' ? 'WhatsApp' : 'Web',
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate average resolution time
    const avgResolutionTimeHours = resolutionTimes.length > 0
      ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length * 10) / 10
      : null;

    const stats: TicketStats = {
      totalTickets: tickets.length,
      openTickets: statusCounts.open,
      inProgressTickets: statusCounts.in_progress,
      resolvedTickets: statusCounts.resolved,
      closedTickets: statusCounts.closed,
      avgResolutionTimeHours,
      ticketsByDay,
      ticketsByStatus,
      ticketsByChannel,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Ticket stats error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
    }, { status: 500 });
  }
}
