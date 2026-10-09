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
- `src/app/portal/` - Customer portal for ticket viewing/creation
- `src/app/chat/` - Standalone AI chat page
- `src/lib/` - Service modules (tickets.ts, categories.ts, analytics.ts, feedback.ts, imap.ts, resend.ts, whatsapp.ts, push-notifications.ts)
- `src/components/` - Reusable React components including AdminHeader
- `src/components/editor/` - TipTap rich text editor with extensions (CalloutExtension, etc.)

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
- Login: `POST /api/admin/auth/login` → Sets signed `admin_session` cookie (JWT/jose, 7 Tage); Rate-Limit über KV; ohne `ADMIN_USER`/`ADMIN_PASS` ist der Login gesperrt
- Logout: `POST /api/admin/auth/logout`
- `src/proxy.ts` prüft die Signatur auf `/admin/*` und `/api/admin/*`; jede Admin-Route zusätzlich per `requireAdmin(req)` (`src/lib/admin-auth.ts`)
- Details/Variablen: `docs/ADMIN-SECURITY.md`

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
- Ticket detail page polls messages every 5 seconds
- Ticket list page polls every 15 seconds
- Status icons: Single checkmark (sent), Double checkmark (delivered), Blue double checkmark (read)

### AI Autoreply System

**Channel-based AI Defaults:**
- `email` channel → `aiStatus: 'disabled'` - No automatic AI responses for emails
- `whatsapp` channel → `aiStatus: 'active'` - AI responds automatically
- `web` channel (Portal/Chat) → `aiStatus: 'active'` - AI responds automatically

**KI-Handling Workflow:**
- New WhatsApp/Web tickets start with `aiStatus: 'active'` - AI responds automatically
- New Email tickets start with `aiStatus: 'disabled'` - requires manual handling
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

### Customer Portal

Located at `/portal` - customers can view and manage their tickets:
- Login via email + ticket number (no password required)
- View all tickets associated with email address
- Create new tickets from portal
- Real-time chat with support in ticket detail view

**Files:**
- `src/app/portal/page.tsx` - Login page
- `src/app/portal/tickets/page.tsx` - Ticket list
- `src/app/portal/ticket/[id]/page.tsx` - Ticket detail with chat
- `src/app/portal/tickets/new/page.tsx` - Create new ticket
- `src/lib/portal.ts` - Portal authentication logic

**Data Layer:**
- `portal:session:{token}` - Session data with email
- Authentication via `/api/portal/auth/login` and `/api/portal/auth/logout`

### Push Notifications (Admin)

Web Push notifications for admins when new tickets arrive:
- Service Worker at `public/sw.js`
- VAPID-based authentication
- Notifications for new tickets and messages

**Files:**
- `src/lib/push-notifications.ts` - Send notifications, manage subscriptions
- `src/app/api/admin/push/subscribe/route.ts` - Save subscription
- `src/app/api/admin/push/unsubscribe/route.ts` - Remove subscription
- `src/components/AdminHeader.tsx` - Notification bell with subscription toggle

**Data Layer:**
- `push:subscription:{id}` - Hash with endpoint, keys
- `push:subscriptions` - Set of all subscription IDs

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
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` - Web Push notifications
- `VAPID_SUBJECT` - mailto: address for VAPID (defaults to support email)

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
import { requireAdmin } from '@/lib/admin-auth';
const denied = await requireAdmin(req);
if (denied) return denied;
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

## FitInn TV-Dashboard Integration

Separate Admin-Sektion für das Fitnessstudio-TV-Display unter `/admin/fitinn-dashboard`.

### Architektur
- **Admin UI**: `src/app/admin/fitinn-dashboard/` - Verwaltung via Hilfe Seite
- **TV Display**: Separates Projekt (`fitinndashboard-temp`) deployed auf `fitinndashboard.vercel.app`
- **Shared Storage**: Beide nutzen dieselbe Vercel KV Datenbank

### Dashboard KV-Keys (Namespace: `fitinn:`)
- `fitinn:config` - Hauptkonfiguration (Layout, Wetter, Öffnungszeiten, QR-Code)
- `fitinn:password` - Gehashtes Dashboard-Passwort
- `fitinn:images` - Karussell-Bilder Metadaten
- `fitinn:setup_complete` - Setup-Status

### Separate KV-Verbindung
Dashboard verwendet eigene KV-Credentials um Namespace-Konflikte zu vermeiden:
```typescript
// src/lib/dashboard/kv.ts
const dashboardKv = createClient({
  url: process.env.DASHBOARD_KV_KV_REST_API_URL!,
  token: process.env.DASHBOARD_KV_KV_REST_API_TOKEN!,
});
```

### Dashboard Features
- **Layouts**: `fullscreen`, `split`, `ticker`
- **Widgets**: Uhrzeit, Wetter (mit Apple-Style Animationen), Öffnungsstatus, QR-Code
- **Karussell**: Wechsel zwischen Leaderboard und Bildern
- **Öffnungszeiten**: Reguläre Zeiten + Feiertage/Sonderöffnungszeiten
- **QR-Code**: Konfigurierbare URL mit App Store Badges

### Dashboard API Routes
- `GET/POST /api/dashboard/config` - Konfiguration lesen/speichern
- `GET /api/dashboard/images` - Bilderliste
- `POST /api/dashboard/upload-image` - Bild hochladen (Base64)
- `POST /api/dashboard/delete-image` - Bild löschen
- `POST /api/dashboard/password` - Passwort ändern
- `POST /api/dashboard/login` / `logout` - Authentifizierung

### Dashboard Environment Variables
- `DASHBOARD_KV_KV_REST_API_URL` - KV URL für Dashboard
- `DASHBOARD_KV_KV_REST_API_TOKEN` - KV Token für Dashboard

## Dokumentenmanagement-System

Admin-Bereich für Dokumenten- und Rechnungsverwaltung unter `/admin/documents`.

### Features
- **Upload**: PDF, Bilder (JPG, PNG, GIF, WebP), Office-Formate (DOCX, XLSX, DOC, XLS)
- **OCR**: Automatische Texterkennung via Claude Vision API
- **Rechnungserkennung**: KI extrahiert Datum, Nummer, Betrag, Lieferant
- **Ordner-System**: Verschachtelte Ordnerstruktur
- **Volltext-Suche**: Über OCR-extrahierten Text
- **Rechnungsansicht**: Gruppierung nach Monat mit Filtern
- **Share-Links**: Dokumente per Link teilen (optional passwortgeschützt, mit Ablaufdatum)
- **Massenexport**: ZIP-Download von Dokumenten/Rechnungen nach Monat/Jahr
- **PDF-Vorschau**: Eingebettete Vorschau im Detail-Panel
- **Einzeldownload**: Direkter Download einzelner Dokumente

### Dateien
- `src/app/admin/documents/page.tsx` - Haupt-UI mit Dokumentenliste, Rechnungsansicht, Upload
- `src/lib/documents.ts` - Dokumenten-CRUD, OCR, Rechnungserkennung
- `src/lib/share.ts` - Share-Link-Verwaltung (Token, Passwort, Ablauf)
- `src/lib/export.ts` - ZIP-Archiv-Erstellung mit `archiver`

### KV-Keys (Dokumente)
- `document:{id}` - Hash: { id, filename, url, contentType, size, folderId, ocrText, isInvoice, invoiceDate, invoiceNumber, invoiceAmount, invoiceVendor, uploadedAt }
- `documents:ids` - Set aller Dokument-IDs
- `folder:{id}` - Hash: { id, name, parentId, createdAt }
- `folders:ids` - Set aller Ordner-IDs

### KV-Keys (Share-Links)
- `share:{token}` - Hash: { token, documentId, createdAt, expiresAt?, passwordHash?, hasPassword, accessCount, createdBy }
- `document:{id}:shares` - Set von Share-Tokens für ein Dokument
- `bulkshare:{token}` - Hash: { token, documentIds (JSON), createdAt, expiresAt?, passwordHash?, hasPassword, accessCount, createdBy, title? }
- `bulkshares:ids` - Set aller Bulk-Share-Tokens

### API Routes (Dokumente)
- `GET/POST /api/admin/documents` - Liste/Upload
- `GET/PUT/DELETE /api/admin/documents/[id]` - Einzelnes Dokument
- `GET /api/admin/documents/[id]/download` - Download mit Content-Disposition
- `GET/POST/DELETE /api/admin/documents/[id]/share` - Share-Links verwalten
- `GET /api/admin/documents/invoices` - Rechnungsliste mit Filtern
- `POST /api/admin/documents/export` - ZIP-Export
- `POST /api/admin/documents/bulk-share` - Bulk-Share für mehrere Dokumente (max. 50)

### API Routes (Öffentlich)
- `GET /api/documents/share/[token]` - Einzelnes geteiltes Dokument
  - Query-Parameter: `password` (wenn geschützt), `download=true` (für Download)
- `GET /api/documents/bulk-share/[token]` - Mehrere geteilte Dokumente
  - Query-Parameter: `password`, `download=true` (ZIP-Archiv)

### Öffentliche Share-Seiten
- `/share/[token]` - Vorschau für einzelnes Dokument (PDF/Bild-Viewer, Download-Button)
- `/share/bulk/[token]` - Übersicht mehrerer Dokumente (Liste, ZIP-Download, Rechnungssumme)

### Rechnungsfilter (GET /api/admin/documents/invoices)
Query-Parameter:
- `q` - Volltextsuche
- `vendor` - Nach Lieferant filtern
- `dateFrom`, `dateTo` - Datumsbereich (ISO-Format)
- `amountMin`, `amountMax` - Betragsbereich
- `sortBy` - `date`, `amount`, `vendor` (Standard: `date`)
- `sortOrder` - `asc`, `desc` (Standard: `desc`)

### Export-Optionen (POST /api/admin/documents/export)
Body:
```json
{
  "documentIds": ["id1", "id2"],  // Spezifische Dokumente
  "month": "2024-01",            // Oder nach Monat
  "year": "2024",                // Oder nach Jahr
  "invoicesOnly": true           // Nur Rechnungen
}
```
- Limit: 50 Dokumente pro Export
- maxDuration: 60 Sekunden

### Share-Link-Beispiel
```typescript
import { createShareLink, validateShareAccess, createBulkShareLink, validateBulkShareAccess } from '@/lib/share';

// Einzelnes Dokument teilen
const shareLink = await createShareLink(documentId, {
  expiresAt: '2024-12-31T23:59:59Z',  // Optional
  password: 'geheim123',               // Optional
  createdBy: 'admin',
});

// Mehrere Dokumente teilen (Bulk-Share)
const bulkShare = await createBulkShareLink(documentIds, {
  title: 'Rechnungen Januar 2024',     // Optional
  expiresAt: '2024-12-31T23:59:59Z',   // Optional
  password: 'geheim123',                // Optional
});

// Zugriff validieren
const result = await validateShareAccess(token, password);
const bulkResult = await validateBulkShareAccess(token, password);
// result.document / bulkResult.documents enthält die Dokumente
```

### UI-Features (Dokumentenverwaltung)
- **Drag & Drop Upload**: Dateien per Drag & Drop hochladen (visuelles Overlay)
- **Grid-Ansicht**: Dokumente als Kacheln (Dropbox-Style), Rechnungen als Liste
- **Mehrfachauswahl**: "Auswählen"-Modus mit Checkboxen, Bulk-Share-Modal
- **Debouncing**: Rechnungssuche mit 300ms Verzögerung (verhindert API-Spam)
- **Vorschau-Modal**: Vollbild-PDF/Bild-Vorschau mit Download/Share-Buttons
