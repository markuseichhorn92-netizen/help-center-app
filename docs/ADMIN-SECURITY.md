# Admin-Sicherheit (Phase 0)

- Login setzt ein **signiertes** Cookie `admin_session` (JWT HS256, `jose`, 7 Tage gültig, httpOnly, secure, sameSite=lax).
- Prüfung zentral: `src/proxy.ts` (Seiten + `/api/admin/*`) und `requireAdmin(req)` (`src/lib/admin-auth.ts`) in jeder Admin-API-Route.
- Kein Default-Passwort: ohne `ADMIN_USER`/`ADMIN_PASS` ist der Login gesperrt (503) und keine Session gültig.
- Rate-Limit: 8 Fehlversuche je IP / 15 Min (Vercel KV, Schlüssel `ratelimit:admin-login:<ip>`); bei KV-Ausfall wird nicht blockiert.
- Basic Auth (für externe Werkzeuge) bleibt mit denselben Variablen möglich.

## Umgebungsvariablen
| Name | Pflicht | Zweck |
|---|---|---|
| `ADMIN_USER`, `ADMIN_PASS` | ja (bestehen) | Zugangsdaten; ohne sie kein Login |
| `ADMIN_SESSION_SECRET` | nein, empfohlen | Eigener Signatur-Schlüssel (≥16 Zeichen, zufällig). Fehlt er, wird er aus USER+PASS abgeleitet – Passwortwechsel beendet dann alle Sitzungen |
| `CRON_SECRET` | empfohlen | Schützt `/api/cron/*`; aktuell nicht gesetzt (Cron-Routen sind dann offen). Vor dem Setzen `vercel.json` (`?secret=…` im Cron-Pfad) anpassen |

## Wirkung beim Deploy
Alle bestehenden (unsignierten) Cookies werden ungültig → einmal neu anmelden.
