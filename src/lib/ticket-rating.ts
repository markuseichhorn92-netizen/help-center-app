import { createClient } from '@vercel/kv';
import crypto from 'crypto';
import { getTicket } from './tickets';

const kv = createClient({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

export interface TicketRating {
  id: string;
  ticketId: string;
  rating: number; // 1-5
  comment?: string;
  createdAt: string;
  customerEmail: string;
}

export interface RatingToken {
  token: string;
  ticketId: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface RatingStats {
  totalRatings: number;
  avgRating: number;
  distribution: { [key: number]: number };
}

// Generate a secure random token
function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

// Create rating token for a ticket (7 days validity)
export async function createRatingToken(ticketId: string): Promise<RatingToken> {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const tokenData: RatingToken = {
    token,
    ticketId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false,
  };

  await kv.hset(`rating:token:${token}`, tokenData as unknown as Record<string, unknown>);

  return tokenData;
}

// Get rating token by token string
export async function getRatingToken(token: string): Promise<RatingToken | null> {
  const data = await kv.hgetall(`rating:token:${token}`);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  return data as unknown as RatingToken;
}

// Validate token and get ticket info
export async function validateRatingToken(token: string): Promise<{
  valid: boolean;
  ticketId?: string;
  error?: string;
}> {
  const tokenData = await getRatingToken(token);
  if (!tokenData) {
    return { valid: false, error: 'Link nicht gefunden' };
  }

  // Check if already used
  if (tokenData.used === true || tokenData.used === 'true' as unknown as boolean) {
    return { valid: false, error: 'Bewertung bereits abgegeben' };
  }

  // Check expiration
  if (new Date(tokenData.expiresAt) < new Date()) {
    return { valid: false, error: 'Link abgelaufen' };
  }

  return { valid: true, ticketId: tokenData.ticketId };
}

// Submit rating for a ticket
export async function submitTicketRating(
  token: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  // Validate token
  const validation = await validateRatingToken(token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const ticketId = validation.ticketId!;

  // Get ticket to verify it exists and get customer email
  const ticket = await getTicket(ticketId);
  if (!ticket) {
    return { success: false, error: 'Ticket nicht gefunden' };
  }

  // Validate rating range
  if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return { success: false, error: 'Ungültige Bewertung' };
  }

  // Create rating data
  const ratingData: TicketRating = {
    id: crypto.randomUUID(),
    ticketId,
    rating,
    comment: comment?.trim() || undefined,
    createdAt: new Date().toISOString(),
    customerEmail: ticket.customerEmail,
  };

  // Save rating to ticket
  await kv.hset(`ticket:${ticketId}:rating`, ratingData as unknown as Record<string, unknown>);

  // Mark token as used
  await kv.hset(`rating:token:${token}`, { used: true });

  // Update aggregated stats
  await updateRatingStats(rating);

  return { success: true };
}

// Update aggregated rating statistics
async function updateRatingStats(rating: number): Promise<void> {
  // Initialize stats if not exists
  const exists = await kv.exists('rating:stats');
  if (!exists) {
    await kv.hset('rating:stats', {
      totalRatings: 0,
      sumRatings: 0,
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 0,
      count5: 0,
    });
  }

  // Increment counters
  await kv.hincrby('rating:stats', 'totalRatings', 1);
  await kv.hincrby('rating:stats', 'sumRatings', rating);
  await kv.hincrby('rating:stats', `count${rating}`, 1);
}

// Get aggregated rating statistics
export async function getRatingStats(): Promise<RatingStats> {
  const stats = await kv.hgetall('rating:stats');
  if (!stats) {
    return {
      totalRatings: 0,
      avgRating: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const total = Number(stats.totalRatings) || 0;
  const sum = Number(stats.sumRatings) || 0;

  return {
    totalRatings: total,
    avgRating: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    distribution: {
      1: Number(stats.count1) || 0,
      2: Number(stats.count2) || 0,
      3: Number(stats.count3) || 0,
      4: Number(stats.count4) || 0,
      5: Number(stats.count5) || 0,
    },
  };
}

// Get rating for a specific ticket
export async function getTicketRating(ticketId: string): Promise<TicketRating | null> {
  const data = await kv.hgetall(`ticket:${ticketId}:rating`);
  if (!data || Object.keys(data).length === 0) {
    return null;
  }
  return data as unknown as TicketRating;
}

// Check if ticket already has a rating
export async function hasTicketRating(ticketId: string): Promise<boolean> {
  const rating = await getTicketRating(ticketId);
  return rating !== null;
}

// Get all ratings (for admin dashboard)
export async function getAllRatings(limit: number = 50): Promise<TicketRating[]> {
  // Get all ticket IDs
  const ticketIds = await kv.smembers('tickets:ids');
  if (!ticketIds || ticketIds.length === 0) {
    return [];
  }

  const ratings: TicketRating[] = [];

  for (const ticketId of ticketIds) {
    const rating = await getTicketRating(ticketId as string);
    if (rating) {
      ratings.push(rating);
    }
    if (ratings.length >= limit) break;
  }

  // Sort by createdAt descending
  ratings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return ratings;
}
