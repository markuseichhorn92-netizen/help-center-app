# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FIT INN Help Center - A Next.js 16 application for customer support with knowledge base articles and a multi-channel ticket system (Email, WhatsApp). Deployed on Vercel.

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
- **WhatsApp**: Twilio API
- **AI**: Anthropic Claude API

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/app/admin/` - Admin dashboard with dedicated layout and header
- `src/lib/` - Service modules (tickets.ts, categories.ts, analytics.ts, feedback.ts, imap.ts, resend.ts, whatsapp.ts)
- `src/components/` - Reusable React components including AdminHeader

### Admin Layout Structure
- `src/app/admin/layout.tsx` - Shared layout with AdminHeader (excludes login page)
- `src/components/AdminHeader.tsx` - Navigation between: Artikel, Tickets, Kategorien, Analytics, Knowledge
- All admin pages use `max-w-7xl` container for consistent width
- Public Header/Footer automatically hidden on `/admin/*` routes

### Data Layer (Vercel KV)

**Tickets & Messages:**
- `ticket:{id}` - Hash with ticket data (includes `channel: 'email' | 'whatsapp' | 'web'`, `aiStatus: 'active' | 'escalated' | 'disabled'`)
- `tickets:ids` - Set of all ticket IDs
- `ticket:{id}:messages` - Set of message IDs per ticket
- `ticket:{id}:human_requested` - Boolean flag for backwards compatibility with AI escalation
- `message:{id}` - Hash with message data (includes `status`, `emailMessageId`, `whatsappMessageId`)

**Message Status Tracking:**
- `status`: `'sent' | 'delivered' | 'read' | 'failed'`
- `deliveredAt`, `readAt`, `failureReason` timestamps
- Updated via webhooks from Resend (email) and Twilio (WhatsApp)

**Articles:**
- `article:{id}` - Hash: { id, title, slug, content, category, published, createdAt, updatedAt }
- `articles:ids` - Set of all article IDs

**Categories:**
- `category:{id}` - Hash: { id, name, icon, description, order, createdAt, updatedAt }
- `categories:ids` - Set of all category IDs
- Icons: `card`, `dumbbell`, `building`, `user`, `more`

**Knowledge Base (Crawler):**
- `knowledge:{id}` - Hash: { id, url, title, content, description, keywords, lastCrawled }
- Used for AI-powered responses in ticket system

**Analytics & Feedback:**
- `article:{id}:views:total` - Integer
- `article:{id}:views:daily` - Sorted Set
- `article:{id}:feedback:helpful` / `not_helpful` - Integers
- `article:{id}:feedback:voters` - Set of visitor hashes

### Authentication

**Cookie-based Session** (primary):
- Login: `POST /api/admin/auth/login` → Sets `admin_session` cookie (24h)
- Logout: `POST /api/admin/auth/logout`
- Middleware checks cookie on `/admin/*` and `/api/admin/*` routes

**Basic Auth** (fallback for API compatibility):
- Header: `Authorization: Basic base64(user:pass)`

### API Structure
- **Public**: `/api/articles`, `/api/categories`, `/api/search`, `/api/tickets`, `/api/chat`
- **Protected**: `/api/admin/*` - requires session cookie
  - `/api/admin/tickets/[id]/ai` - GET/POST for AI status control per ticket
- **Webhooks**:
  - `/api/webhooks/resend` - Email delivery/open tracking
  - `/api/webhooks/whatsapp-status` - WhatsApp delivery/read receipts
  - `/api/webhooks/whatsapp` - Incoming WhatsApp messages
- **Cron**: `/api/cron/fetch-emails`, `/api/cron/crawl`

### Multi-Channel Messaging

**Email (Resend + IMAP):**
- Outbound: `src/lib/resend.ts` - HTML templates with logo
- Inbound: `src/lib/imap.ts` - Parses HTML content, sanitizes scripts/styles
- Tracking: Webhook receives `email.delivered`, `email.opened`, `email.bounced`

**WhatsApp (Twilio):**
- Outbound: `src/lib/whatsapp.ts` - Includes `StatusCallback` URL for tracking
- HTML stripped before sending via `stripHtmlForWhatsApp()` (converts HTML to plain text)
- Inbound: `/api/webhooks/whatsapp` - Creates tickets from WhatsApp messages
- Tracking: `/api/webhooks/whatsapp-status` - Receives `sent`, `delivered`, `read`, `failed`

**Real-time Status Updates:**
- Ticket detail page polls messages every 3 seconds
- Status icons: Single checkmark (sent), Double checkmark (delivered), Blue double checkmark (read)

### AI Autoreply System

**KI-Handling Workflow:**
- New tickets start with `aiStatus: 'active'` - AI responds automatically
- Customer writes "Mitarbeiter" → `aiStatus: 'escalated'` - AI stops, ticket moves to "Offen"
- Admin clicks "KI deaktivieren" → `aiStatus: 'disabled'` - AI stops, ticket moves to "Offen"
- Admin can re-enable AI → `aiStatus: 'active'` - ticket moves back to "KI bearbeitet"

**Files:**
- `src/lib/ai-autoreply.ts` - AI response generation, status management
- `src/app/api/admin/tickets/[id]/ai/route.ts` - API for toggling AI per ticket

**Filter Logic:**
- "KI bearbeitet" tab: Shows tickets where `aiStatus === 'active'`
- "Offen" tab: Shows tickets where `aiStatus === 'escalated' || 'disabled'`

### Dedicated AI Chat Page

Located at `/chat` - standalone chat without login requirement:
- User provides email for follow-up
- AI answers questions based on knowledge base
- Typing "Mitarbeiter" creates a ticket and escalates to human support
- Chat history stored in `chat:session:{sessionId}`

**Files:**
- `src/app/chat/page.tsx` - Chat UI component
- `src/app/api/chat/route.ts` - AI chat endpoint
- `src/app/api/chat/escalate/route.ts` - Ticket creation from chat

## Environment Variables

Required:
- `ADMIN_USER`, `ADMIN_PASS` - Admin credentials
- `KV_REST_API_URL`, `KV_REST_API_TOKEN` - Vercel KV
- `RESEND_API_KEY`, `SUPPORT_EMAIL` - Email sending
- `IMAP_HOST`, `IMAP_USER`, `IMAP_PASS` - Email fetching
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` - WhatsApp
- `NEXT_PUBLIC_BASE_URL` - Required for webhook callbacks (e.g., `https://hilfe.fit-inn-trier.de`)
- `ANTHROPIC_API_KEY` - Claude AI for ticket responses
- `CRON_SECRET` - Cron job authentication

## Styling

Custom Tailwind theme:
- Brand: `brand` (#0a4958), `brand-dark`
- Grays: `apple-gray-50` through `apple-gray-600`
- Radius: `rounded-apple`, `rounded-apple-lg`, `rounded-apple-xl`
- Shadows: `shadow-card`, `shadow-apple`
- Effects: `glass` (header), `bg-hero-gradient`

## Code Patterns

### Cookie Auth Check (API Routes)
```typescript
const sessionCookie = req.cookies.get('admin_session');
if (!sessionCookie?.value) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Message Status Icon Component
Located in `src/app/admin/tickets/[id]/page.tsx`:
- Shows delivery status for admin messages only
- Uses SVG checkmarks with different colors/counts

### Email HTML Processing
In `src/lib/imap.ts`:
- Prefers HTML content over plaintext
- Sanitizes: removes `<script>`, `<style>`, event handlers
- Plaintext fallback: escapes HTML entities, converts `\n` to `<br>`

### AI Status Management
```typescript
import { getAIStatus, setAIStatus } from '@/lib/ai-autoreply';

// Get current status
const status = await getAIStatus(ticketId); // 'active' | 'escalated' | 'disabled'

// Toggle AI for a ticket
await setAIStatus(ticketId, 'disabled'); // Admin disables AI
await setAIStatus(ticketId, 'active');   // Admin re-enables AI
```

### WhatsApp HTML Stripping
In `src/lib/whatsapp.ts`:
- Converts `<br>`, `</p>`, `</div>`, `</li>` to newlines
- Removes all other HTML tags
- Decodes HTML entities (including German umlauts)
- Cleans up excessive newlines
