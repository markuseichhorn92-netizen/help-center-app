import { describe, it, expect } from 'vitest';
import { buildAdminNotification, messageToPlainText, formatFileSize } from './admin-notification';
import { parseTicketNumberFromSubject } from './resend';

const base = {
  ticketId: 'abc-123',
  ticketNumber: 'TKT-4711',
  customerName: 'Erika <b>Musterfrau</b>',
  customerEmail: 'erika@example.org',
  phone: '+49 651 000000',
  subject: 'Kündigung & Frage',
  content: 'Hallo,\nich habe 5 < 10 & 7 > 3 als Frage.\n\nGruß Erika',
  channel: 'web',
  createdAt: '2026-07-01T10:30:00Z',
  attachments: [{ filename: 'vertrag.pdf', size: 245760 }],
  baseUrl: 'https://hilfe.example',
};

describe('buildAdminNotification', () => {
  it('enthält alle Felder, escaped HTML und erhält Zeilenumbrüche', () => {
    const m = buildAdminNotification(base);
    expect(m.html).toContain('TKT-4711');
    expect(m.html).toContain('Kundenanfrage');
    expect(m.html).toContain('Erika &lt;b&gt;Musterfrau&lt;/b&gt;');
    expect(m.html).toContain('+49 651 000000');
    expect(m.html).toContain('Kündigung &amp; Frage');
    expect(m.html).toContain('Formular');
    expect(m.html).toContain('01.07.2026, 12:30 Uhr'); // Europe/Berlin (MESZ)
    expect(m.html).toContain('5 &lt; 10 &amp; 7 &gt; 3');
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('white-space:pre-wrap');
    expect(m.html).toContain('Hallo,\nich habe');
    expect(m.html).toContain('vertrag.pdf');
    expect(m.html).toContain('240,0 KB');
    expect(m.html).toContain('href="https://hilfe.example/admin/tickets/abc-123"');
    expect(m.text).toContain('Telefon: +49 651 000000');
    expect(m.text).toContain('Ticket öffnen: https://hilfe.example/admin/tickets/abc-123');
  });

  it('setzt Reply-To auf den Kunden und Ticket-Nr. im Betreff (für Zuordnung)', () => {
    const m = buildAdminNotification(base);
    expect(m.replyTo).toBe('erika@example.org');
    expect(parseTicketNumberFromSubject(m.subject)).toBe('TKT-4711');
  });

  it('kein Reply-To bei WhatsApp-Pseudo-Adresse; Kanal WhatsApp', () => {
    const m = buildAdminNotification({ ...base, channel: 'whatsapp', customerEmail: '4915100000@whatsapp' });
    expect(m.replyTo).toBeUndefined();
    expect(m.html).toContain('WhatsApp');
  });

  it('E-Mail-Kanal, HTML-Inhalt wird zu Text; Eskalation gekennzeichnet', () => {
    const m = buildAdminNotification({ ...base, channel: 'email', content: '<p>Zeile 1</p><p>Zeile&nbsp;2<br>3 &amp; 4</p>', phone: undefined, attachments: [] });
    expect(m.text).toContain('Zeile 1\nZeile 2\n3 & 4');
    expect(m.text).not.toContain('Telefon');
    expect(m.text).not.toContain('Anhänge');
    const e = buildAdminNotification({ ...base, isEscalation: true });
    expect(e.subject).toContain('Eskalation');
    expect(e.html).toContain('KI-Eskalation');
  });

  it('Skripte in HTML-Mails landen nicht in der Benachrichtigung', () => {
    const m = buildAdminNotification({ ...base, content: '<p>Hallo</p><script>alert(1)</script><img src=x onerror=alert(2)>' });
    expect(m.html).not.toContain('<script');
    expect(m.html).not.toContain('<img');
    expect(m.text).toContain('Hallo');
    expect(m.text).not.toContain('alert(1)');
  });

  it('Betreff ohne Zeilenumbrüche (Header-Injection)', () => {
    expect(buildAdminNotification({ ...base, subject: 'a\r\nBcc: x@y.de' }).subject).not.toMatch(/[\r\n]/);
  });
});

describe('Hilfsfunktionen', () => {
  it('messageToPlainText', () => {
    expect(messageToPlainText('a\r\nb')).toBe('a\nb');
    expect(messageToPlainText(undefined)).toBe('');
  });
  it('formatFileSize', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2,0 MB');
  });
});
