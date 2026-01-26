# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FIT INN Help Center - A Next.js 16 application for customer support with knowledge base articles and a ticket system with email integration. Deployed on Vercel.

## Development Commands

```bash
npm run dev      # Start dev server on localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with custom theme
- **Storage**: Vercel KV (Redis)
- **Email**: Resend (outbound), IMAP/IONOS (inbound)
- **AI**: Anthropic Claude API

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/lib/` - Service modules (tickets.ts, categories.ts, analytics.ts, feedback.ts, imap.ts, resend.ts)
- `src/components/` - Reusable React components
- `src/middleware.ts` - HTTP Basic Auth for /admin routes

### Data Layer (Vercel KV)

**Tickets & Messages:**
- `ticket:{id}` - Hash with ticket data
- `tickets:ids` - Set of all ticket IDs
- `ticket:{id}:messages` - Set of message IDs per ticket
- `message:{id}` - Hash with message data

**Articles:**
- `article:{id}` - Hash with article data
- `articles:ids` - Set of all article IDs

**Categories:**
- `category:{id}` - Hash: { id, name, icon, description, order, createdAt, updatedAt }
- `categories:ids` - Set of all category IDs

**Analytics:**
- `article:{id}:views:total` - Integer: total view count
- `article:{id}:views:daily` - Sorted Set: { "2024-01-26": count }
- `analytics:popular` - Sorted Set: { articleId: totalViews }

**Feedback:**
- `article:{id}:feedback:helpful` - Integer: helpful votes
- `article:{id}:feedback:not_helpful` - Integer: not helpful votes
- `article:{id}:feedback:voters` - Set of visitor hashes (duplicate prevention)

### Authentication
Admin routes (`/admin/*`, `/api/admin/*`) use HTTP Basic Auth. Credentials are in env vars `ADMIN_USER` and `ADMIN_PASS`. Client-side requests use `NEXT_PUBLIC_ADMIN_USER/PASS`.

### API Structure
- **Public**: `/api/articles`, `/api/categories`, `/api/search`, `/api/tickets` (POST)
- **Public Article APIs**: `/api/articles/{id}/view` (POST), `/api/articles/{id}/feedback`
- **Protected**: `/api/admin/*` - requires Basic Auth header
- **Cron**: `/api/cron/fetch-emails` - scheduled email fetching
- **Webhooks**: `/api/webhooks/resend`, `/api/webhooks/whatsapp`

### Email Integration
- Incoming emails fetched via IMAP from IONOS, processed in `src/lib/imap.ts`
- Outgoing emails sent via Resend in `src/lib/resend.ts`
- Ticket numbers (TKT-XXX) in subject lines link replies to existing tickets

## Code Patterns

### API Route Authentication
```typescript
function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth || !basicAuth.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(basicAuth.split(' ')[1], 'base64').toString().split(':');
  return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
}
```

### Client-side Auth Header
```typescript
const authHeader = `Basic ${btoa(`${process.env.NEXT_PUBLIC_ADMIN_USER}:${process.env.NEXT_PUBLIC_ADMIN_PASS}`)}`;
```

### Vercel KV Operations
Uses `@vercel/kv` client with `hmset`, `hgetall`, `sadd`, `smembers`, `srem`, `del`, `incr`, `zincrby`, `zrange` operations.

## Environment Variables

Required for full functionality:
- `ANTHROPIC_API_KEY` - Claude AI
- `ADMIN_USER`, `ADMIN_PASS` - Admin auth
- `NEXT_PUBLIC_ADMIN_USER`, `NEXT_PUBLIC_ADMIN_PASS` - Client-side admin auth
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` - Vercel KV
- `RESEND_API_KEY`, `SUPPORT_EMAIL` - Email sending
- `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS` - Email fetching
- `CRON_SECRET` - Cron job auth

## Styling

Custom Tailwind theme with:
- Brand color: `brand` (#0a4958), `brand-dark`
- Gray scale: `apple-gray-50` through `apple-gray-600`
- Border radius: `rounded-apple`, `rounded-apple-lg`, `rounded-apple-xl`
- Shadows: `shadow-card`, `shadow-apple`, `shadow-apple-lg`
- Gradient: `bg-hero-gradient`
