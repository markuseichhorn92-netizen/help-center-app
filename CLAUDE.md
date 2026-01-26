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
- `src/app/admin/` - Admin dashboard, article editor, categories, analytics
- `src/app/admin/login/` - Admin login page
- `src/app/articles/[id]/` - Article detail page with TOC
- `src/lib/` - Service modules (tickets.ts, categories.ts, analytics.ts, feedback.ts, imap.ts, resend.ts)
- `src/components/` - Reusable React components
- `src/middleware.ts` - Cookie-based auth for /admin routes

### Data Layer (Vercel KV)

**Tickets & Messages:**
- `ticket:{id}` - Hash with ticket data
- `tickets:ids` - Set of all ticket IDs
- `ticket:{id}:messages` - Set of message IDs per ticket
- `message:{id}` - Hash with message data

**Articles:**
- `article:{id}` - Hash: { id, title, slug, content, category, published, createdAt, updatedAt }
- `articles:ids` - Set of all article IDs

**Categories:**
- `category:{id}` - Hash: { id, name, icon, description, order, createdAt, updatedAt }
- `categories:ids` - Set of all category IDs
- Icons: `card`, `dumbbell`, `building`, `user`, `more`

**Analytics:**
- `article:{id}:views:total` - Integer: total view count
- `article:{id}:views:daily` - Sorted Set: { "2024-01-26": count }
- `analytics:popular` - Sorted Set: { articleId: totalViews }

**Feedback:**
- `article:{id}:feedback:helpful` - Integer: helpful votes
- `article:{id}:feedback:not_helpful` - Integer: not helpful votes
- `article:{id}:feedback:voters` - Set of visitor hashes (duplicate prevention)

### Authentication

**Admin Login Page** (`/admin/login`):
- Cookie-based session authentication
- Session cookie `admin_session` valid for 24 hours
- Login API: `POST /api/admin/auth/login`
- Logout API: `POST /api/admin/auth/logout`

**Middleware** (`src/middleware.ts`):
- Protects `/admin/*` routes (except `/admin/login`)
- Protects `/api/admin/*` routes (except `/api/admin/auth/*`)
- Redirects unauthenticated users to login page
- Falls back to Basic Auth for API compatibility

### API Structure
- **Public**: `/api/articles`, `/api/categories`, `/api/search`, `/api/tickets` (POST)
- **Public Article APIs**: `/api/articles/{id}/view` (POST), `/api/articles/{id}/feedback`
- **Protected**: `/api/admin/*` - requires session cookie or Basic Auth
- **Auth**: `/api/admin/auth/login`, `/api/admin/auth/logout`
- **Cron**: `/api/cron/fetch-emails` - scheduled email fetching
- **Webhooks**: `/api/webhooks/resend`, `/api/webhooks/whatsapp`

### Email Integration
- Incoming emails fetched via IMAP from IONOS, processed in `src/lib/imap.ts`
- Outgoing emails sent via Resend in `src/lib/resend.ts`
- Ticket numbers (TKT-XXX) in subject lines link replies to existing tickets

## Mobile-First Design

All pages are optimized for mobile devices:

### Responsive Patterns
- **Grid layouts**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Category grid**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
- **Typography**: `text-3xl sm:text-4xl lg:text-5xl`
- **Spacing**: `py-8 md:py-12`, `px-4 sm:px-6 lg:px-8`
- **Flex wrap**: `flex flex-wrap gap-2 sm:gap-3`

### Mobile-Specific Features
- **Header**: Hamburger menu on mobile (`sm:hidden`), desktop nav hidden (`hidden sm:flex`)
- **Admin Navigation**: Icon-only buttons on mobile, text visible on `sm:` breakpoint
- **Article TOC**: Inline on mobile (`lg:hidden`), sticky sidebar on desktop (`hidden lg:block`)
- **Footer**: 2-column grid on mobile, 4-column on desktop

### Breakpoints
- `sm`: 640px (small tablets)
- `md`: 768px (tablets)
- `lg`: 1024px (desktop)

## Code Patterns

### Cookie-based Authentication (Middleware)
```typescript
const sessionCookie = req.cookies.get('admin_session');
if (!sessionCookie?.value) {
  return NextResponse.redirect(new URL('/admin/login', req.url));
}
```

### API Route Authentication (Fallback)
```typescript
function isAuthenticated(req: NextRequest): boolean {
  const basicAuth = req.headers.get('authorization');
  if (!basicAuth || !basicAuth.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(basicAuth.split(' ')[1], 'base64').toString().split(':');
  return user === process.env.ADMIN_USER && pass === process.env.ADMIN_PASS;
}
```

### Vercel KV Operations
Uses `@vercel/kv` client with `hmset`, `hgetall`, `sadd`, `smembers`, `srem`, `del`, `incr`, `zincrby`, `zrange` operations.

### Callout Blocks
Article content supports callout blocks with CSS styling:
- Attributes: `data-callout="true"`, `data-callout-type="info|success|warning|danger"`
- CSS in `globals.css` handles icon display via `::before` pseudo-element

## Environment Variables

Required for full functionality:
- `ANTHROPIC_API_KEY` - Claude AI
- `ADMIN_USER`, `ADMIN_PASS` - Admin auth
- `NEXT_PUBLIC_ADMIN_USER`, `NEXT_PUBLIC_ADMIN_PASS` - Client-side admin auth (legacy)
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
- Glass effect: `glass` class for header

## Key Components

- `Header.tsx` - Responsive header with mobile menu
- `SearchAutocomplete.tsx` - Search with autocomplete suggestions
- `FeedbackWidget.tsx` - Article helpful/not helpful voting
- `RelatedArticles.tsx` - Shows related articles by category
- `ContactCTA.tsx` - Contact support call-to-action
- `editor/RichTextEditor.tsx` - TipTap-based article editor with callout support
