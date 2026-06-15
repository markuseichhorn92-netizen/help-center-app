import { kv } from './kv';
import { Ticket, getTicket, getAllTickets, getTicketMessages } from './tickets';

// SLA Configuration
export interface SLAConfig {
  // First response time targets in hours
  firstResponseHours: {
    high: number;
    medium: number;
    low: number;
  };
  // Resolution time targets in hours
  resolutionHours: {
    high: number;
    medium: number;
    low: number;
  };
  // Business hours (optional - for future enhancement)
  businessHours?: {
    start: number; // 0-23
    end: number; // 0-23
    workDays: number[]; // 0-6 (Sunday-Saturday)
  };
}

// Default SLA configuration
export const DEFAULT_SLA_CONFIG: SLAConfig = {
  firstResponseHours: {
    high: 1, // 1 hour for high priority
    medium: 4, // 4 hours for medium priority
    low: 8, // 8 hours for low priority
  },
  resolutionHours: {
    high: 4, // 4 hours for high priority
    medium: 24, // 24 hours for medium priority
    low: 48, // 48 hours for low priority
  },
};

// SLA status for a ticket
export interface TicketSLAStatus {
  ticketId: string;
  ticketNumber: string;
  customerName: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  status: string;
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  // Calculated fields
  firstResponseTime: number | null; // in minutes
  resolutionTime: number | null; // in minutes
  firstResponseTarget: number; // in minutes
  resolutionTarget: number; // in minutes
  firstResponseBreached: boolean;
  resolutionBreached: boolean;
  firstResponseTimeRemaining: number | null; // in minutes (negative = overdue)
  resolutionTimeRemaining: number | null; // in minutes (negative = overdue)
}

// SLA statistics
export interface SLAStats {
  // Response times
  avgFirstResponseTime: number; // in minutes
  avgResolutionTime: number; // in minutes
  // Compliance rates
  firstResponseCompliance: number; // percentage
  resolutionCompliance: number; // percentage
  // Counts
  totalTickets: number;
  ticketsMeetingFirstResponseSLA: number;
  ticketsMeetingResolutionSLA: number;
  // Currently violating
  currentlyViolating: TicketSLAStatus[];
}

// Period-based stats
export interface SLAStatsByPeriod {
  today: SLAPeriodStats;
  thisWeek: SLAPeriodStats;
  thisMonth: SLAPeriodStats;
}

export interface SLAPeriodStats {
  avgFirstResponseTime: number;
  avgResolutionTime: number;
  firstResponseCompliance: number;
  resolutionCompliance: number;
  totalTickets: number;
}

// Get SLA config (from KV or default)
export async function getSLAConfig(): Promise<SLAConfig> {
  const config = await kv.hgetall('sla:config');
  if (!config || Object.keys(config).length === 0) {
    return DEFAULT_SLA_CONFIG;
  }
  
  return {
    firstResponseHours: typeof config.firstResponseHours === 'string' 
      ? JSON.parse(config.firstResponseHours) 
      : config.firstResponseHours || DEFAULT_SLA_CONFIG.firstResponseHours,
    resolutionHours: typeof config.resolutionHours === 'string'
      ? JSON.parse(config.resolutionHours)
      : config.resolutionHours || DEFAULT_SLA_CONFIG.resolutionHours,
    businessHours: config.businessHours 
      ? (typeof config.businessHours === 'string' ? JSON.parse(config.businessHours) : config.businessHours)
      : undefined,
  };
}

// Save SLA config
export async function saveSLAConfig(config: SLAConfig): Promise<void> {
  await kv.hset('sla:config', {
    firstResponseHours: JSON.stringify(config.firstResponseHours),
    resolutionHours: JSON.stringify(config.resolutionHours),
    ...(config.businessHours && { businessHours: JSON.stringify(config.businessHours) }),
  });
}

// Track first response time for a ticket
export async function trackFirstResponse(ticketId: string): Promise<void> {
  const ticket = await getTicket(ticketId);
  if (!ticket) return;

  // Check if already tracked
  const existingResponse = await kv.hget(`ticket:${ticketId}`, 'firstResponseAt');
  if (existingResponse) return;

  const now = new Date().toISOString();
  await kv.hset(`ticket:${ticketId}`, { 
    firstResponseAt: now,
    updatedAt: now,
  });
}

// Calculate SLA status for a single ticket
export async function getTicketSLAStatus(ticketId: string): Promise<TicketSLAStatus | null> {
  const ticket = await getTicket(ticketId);
  if (!ticket) return null;

  const config = await getSLAConfig();
  
  // Get first response time from messages
  const messages = await getTicketMessages(ticketId);
  const adminMessage = messages.find(m => m.sender === 'admin');
  const firstResponseAt = adminMessage?.createdAt || (ticket as any).firstResponseAt || null;

  const createdAt = new Date(ticket.createdAt);
  const now = new Date();
  
  // Calculate times
  const firstResponseTime = firstResponseAt 
    ? Math.round((new Date(firstResponseAt).getTime() - createdAt.getTime()) / 60000)
    : null;
  
  const resolutionTime = ticket.resolvedAt
    ? Math.round((new Date(ticket.resolvedAt).getTime() - createdAt.getTime()) / 60000)
    : null;

  // Get targets based on priority
  const priority = ticket.priority || 'medium';
  const firstResponseTarget = config.firstResponseHours[priority] * 60; // convert to minutes
  const resolutionTarget = config.resolutionHours[priority] * 60; // convert to minutes

  // Calculate remaining time or overdue
  const elapsedMinutes = Math.round((now.getTime() - createdAt.getTime()) / 60000);
  
  const firstResponseTimeRemaining = firstResponseAt 
    ? null // Already responded
    : firstResponseTarget - elapsedMinutes;
  
  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const resolutionTimeRemaining = isResolved
    ? null // Already resolved
    : resolutionTarget - elapsedMinutes;

  // Check breaches
  const firstResponseBreached = firstResponseAt
    ? firstResponseTime! > firstResponseTarget
    : elapsedMinutes > firstResponseTarget;
  
  const resolutionBreached = isResolved
    ? resolutionTime! > resolutionTarget
    : elapsedMinutes > resolutionTarget;

  return {
    ticketId: ticket.id,
    ticketNumber: ticket.ticketNumber,
    customerName: ticket.customerName,
    subject: ticket.subject,
    priority,
    status: ticket.status,
    createdAt: ticket.createdAt,
    firstResponseAt,
    resolvedAt: ticket.resolvedAt || null,
    firstResponseTime,
    resolutionTime,
    firstResponseTarget,
    resolutionTarget,
    firstResponseBreached,
    resolutionBreached,
    firstResponseTimeRemaining,
    resolutionTimeRemaining,
  };
}

// Get SLA statistics for a period
export async function getSLAStats(startDate?: Date, endDate?: Date): Promise<SLAStats> {
  const allTickets = await getAllTickets();
  const config = await getSLAConfig();
  
  // Filter by date if provided
  const tickets = allTickets.filter(t => {
    if (!startDate && !endDate) return true;
    const created = new Date(t.createdAt);
    if (startDate && created < startDate) return false;
    if (endDate && created > endDate) return false;
    return true;
  });

  // Exclude deleted/spam tickets
  const activeTickets = tickets.filter(t => !t.deletedAt && !t.isSpam);

  const slaStatuses: TicketSLAStatus[] = [];
  
  for (const ticket of activeTickets) {
    const status = await getTicketSLAStatus(ticket.id);
    if (status) slaStatuses.push(status);
  }

  // Calculate statistics
  const ticketsWithFirstResponse = slaStatuses.filter(s => s.firstResponseTime !== null);
  const ticketsWithResolution = slaStatuses.filter(s => s.resolutionTime !== null);
  
  const avgFirstResponseTime = ticketsWithFirstResponse.length > 0
    ? Math.round(ticketsWithFirstResponse.reduce((sum, s) => sum + s.firstResponseTime!, 0) / ticketsWithFirstResponse.length)
    : 0;
  
  const avgResolutionTime = ticketsWithResolution.length > 0
    ? Math.round(ticketsWithResolution.reduce((sum, s) => sum + s.resolutionTime!, 0) / ticketsWithResolution.length)
    : 0;

  const ticketsMeetingFirstResponseSLA = ticketsWithFirstResponse.filter(s => !s.firstResponseBreached).length;
  const ticketsMeetingResolutionSLA = ticketsWithResolution.filter(s => !s.resolutionBreached).length;

  const firstResponseCompliance = ticketsWithFirstResponse.length > 0
    ? Math.round((ticketsMeetingFirstResponseSLA / ticketsWithFirstResponse.length) * 100)
    : 100;
  
  const resolutionCompliance = ticketsWithResolution.length > 0
    ? Math.round((ticketsMeetingResolutionSLA / ticketsWithResolution.length) * 100)
    : 100;

  // Get currently violating tickets (open tickets that are over SLA)
  const currentlyViolating = slaStatuses.filter(s => 
    (s.status === 'open' || s.status === 'in_progress') &&
    (s.firstResponseBreached || s.resolutionBreached)
  ).sort((a, b) => {
    // Sort by most urgent (most negative remaining time first)
    const aUrgency = Math.min(
      a.firstResponseTimeRemaining ?? Infinity,
      a.resolutionTimeRemaining ?? Infinity
    );
    const bUrgency = Math.min(
      b.firstResponseTimeRemaining ?? Infinity,
      b.resolutionTimeRemaining ?? Infinity
    );
    return aUrgency - bUrgency;
  });

  return {
    avgFirstResponseTime,
    avgResolutionTime,
    firstResponseCompliance,
    resolutionCompliance,
    totalTickets: slaStatuses.length,
    ticketsMeetingFirstResponseSLA,
    ticketsMeetingResolutionSLA,
    currentlyViolating,
  };
}

// Get SLA stats by period (today, this week, this month)
export async function getSLAStatsByPeriod(): Promise<SLAStatsByPeriod> {
  const now = new Date();
  
  // Today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // This week (Monday as start)
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - diffToMonday);
  
  // This month
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayStats, weekStats, monthStats] = await Promise.all([
    getSLAStats(todayStart),
    getSLAStats(weekStart),
    getSLAStats(monthStart),
  ]);

  return {
    today: {
      avgFirstResponseTime: todayStats.avgFirstResponseTime,
      avgResolutionTime: todayStats.avgResolutionTime,
      firstResponseCompliance: todayStats.firstResponseCompliance,
      resolutionCompliance: todayStats.resolutionCompliance,
      totalTickets: todayStats.totalTickets,
    },
    thisWeek: {
      avgFirstResponseTime: weekStats.avgFirstResponseTime,
      avgResolutionTime: weekStats.avgResolutionTime,
      firstResponseCompliance: weekStats.firstResponseCompliance,
      resolutionCompliance: weekStats.resolutionCompliance,
      totalTickets: weekStats.totalTickets,
    },
    thisMonth: {
      avgFirstResponseTime: monthStats.avgFirstResponseTime,
      avgResolutionTime: monthStats.avgResolutionTime,
      firstResponseCompliance: monthStats.firstResponseCompliance,
      resolutionCompliance: monthStats.resolutionCompliance,
      totalTickets: monthStats.totalTickets,
    },
  };
}

// Format minutes to human-readable string
export function formatDuration(minutes: number): string {
  if (minutes < 0) {
    return `-${formatDuration(Math.abs(minutes))}`;
  }
  
  if (minutes < 60) {
    return `${minutes} Min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
