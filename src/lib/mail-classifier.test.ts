import { describe, it, expect } from 'vitest';
import { classifyByRules, classifyEmail, emptyLearned, MailInfo } from './mail-classifier';

function mail(over: Partial<MailInfo> = {}): MailInfo {
  return {
    fromEmail: 'erika.beispiel@example.com',
    fromName: 'Erika Beispiel',
    subject: 'Frage zu meiner Mitgliedschaft',
    text: 'Hallo, ich möchte wissen, wann ihr samstags öffnet.',
    headers: {},
    attachmentNames: [],
    ...over,
  };
}

describe('classifyByRules', () => {
  it('normale Kundenmail bleibt unklar (null) und wird später Kundenanfrage', () => {
    expect(classifyByRules(mail())).toBeNull();
  });

  it('List-Unsubscribe-Header → Sonstiges', () => {
    const r = classifyByRules(mail({ fromEmail: 'angebote@shop.example', headers: { 'list-unsubscribe': '<mailto:x@example.com>' } }));
    expect(r?.category).toBe('sonstiges');
    expect(r?.source).toBe('rule');
  });

  it('Precedence bulk → Sonstiges', () => {
    expect(classifyByRules(mail({ headers: { precedence: 'bulk' } }))?.category).toBe('sonstiges');
  });

  it('Auto-Submitted → Sonstiges, "no" jedoch nicht', () => {
    expect(classifyByRules(mail({ headers: { 'auto-submitted': 'auto-generated' } }))?.category).toBe('sonstiges');
    expect(classifyByRules(mail({ headers: { 'auto-submitted': 'no' } }))).toBeNull();
  });

  it('noreply- und Newsletter-Absender → Sonstiges', () => {
    expect(classifyByRules(mail({ fromEmail: 'noreply@beispiel-firma.example' }))?.category).toBe('sonstiges');
    expect(classifyByRules(mail({ fromEmail: 'newsletter@beispiel-firma.example' }))?.category).toBe('sonstiges');
    expect(classifyByRules(mail({ fromEmail: 'no-reply+abc@beispiel-firma.example' }))?.category).toBe('sonstiges');
  });

  it('bekannter Systemabsender → Sonstiges', () => {
    expect(classifyByRules(mail({ fromEmail: 'team@vercel.com', subject: 'Deployment fehlgeschlagen', text: 'Build error' }))?.category).toBe('sonstiges');
    expect(classifyByRules(mail({ fromEmail: 'alerts@mail.stripe.com', subject: 'Hinweis', text: 'Zahlung' }))?.category).toBe('sonstiges');
  });

  it('Systemabsender mit Kundenthema bleibt unklar', () => {
    expect(classifyByRules(mail({ fromEmail: 'max@google.com', subject: 'Kündigung meiner Mitgliedschaft', text: 'bitte kündigen' }))).toBeNull();
  });

  it('Rechnung als PDF von Firma → Sonstiges', () => {
    const r = classifyByRules(mail({ fromEmail: 'buchhaltung@lieferant-gmbh.example', subject: 'Rechnung 2026-1234', attachmentNames: ['Rechnung_2026-1234.pdf'], text: 'Anbei Ihre Rechnung.' }));
    expect(r?.category).toBe('sonstiges');
    expect(r?.reason).toContain('Rechnung');
  });

  it('Rechnung-PDF von Privatperson (Freemail) bleibt Kundenanfrage', () => {
    expect(classifyByRules(mail({ fromEmail: 'max.muster@gmail.com', subject: 'Rechnung', attachmentNames: ['rechnung.pdf'], text: 'Meine Rechnung' }))).toBeNull();
  });

  it('Bewerbung bleibt Kundenanfrage, aber wichtig/intern – auch bei Newsletter-Header', () => {
    const r = classifyByRules(mail({ subject: 'Bewerbung als Trainer', headers: { 'list-unsubscribe': '<x>' } }));
    expect(r?.category).toBe('kundenanfrage');
    expect(r?.important).toBe(true);
  });

  it('gelernte Absender haben Vorrang', () => {
    const learned = emptyLearned();
    learned.sonstiges.add('info@werbung.example');
    learned.kundenanfrage.add('noreply@wichtig.example');
    expect(classifyByRules(mail({ fromEmail: 'INFO@werbung.example' }), learned)?.source).toBe('learned');
    expect(classifyByRules(mail({ fromEmail: 'info@werbung.example' }), learned)?.category).toBe('sonstiges');
    expect(classifyByRules(mail({ fromEmail: 'noreply@wichtig.example' }), learned)?.category).toBe('kundenanfrage');
  });
});

describe('classifyEmail', () => {
  it('im Zweifel Kundenanfrage, KI wird bei normaler Mail nicht gefragt', async () => {
    let called = 0;
    const r = await classifyEmail(mail(), { ai: async () => { called++; return { category: 'sonstiges', reason: 'x' }; } });
    expect(r.category).toBe('kundenanfrage');
    expect(r.source).toBe('default');
    expect(called).toBe(0);
  });

  it('KI entscheidet bei Verdacht', async () => {
    const r = await classifyEmail(
      mail({ fromEmail: 'info@werbeagentur.example', subject: 'Webinar: mehr Reichweite', text: 'Jetzt anmelden. Abbestellen' }),
      { ai: async () => ({ category: 'sonstiges', reason: 'Werbung' }) }
    );
    expect(r.category).toBe('sonstiges');
    expect(r.source).toBe('ai');
    expect(r.reason).toContain('KI');
  });

  it('KI-Fehler oder keine Antwort → Kundenanfrage', async () => {
    const m = mail({ fromEmail: 'info@werbeagentur.example', subject: 'Webinar heute' });
    expect((await classifyEmail(m, { ai: async () => { throw new Error('down'); } })).category).toBe('kundenanfrage');
    expect((await classifyEmail(m, { ai: async () => null })).category).toBe('kundenanfrage');
    expect((await classifyEmail(m)).category).toBe('kundenanfrage');
  });

  it('Regel schlägt KI', async () => {
    let called = 0;
    const r = await classifyEmail(mail({ fromEmail: 'noreply@x.example' }), { ai: async () => { called++; return null; } });
    expect(r.category).toBe('sonstiges');
    expect(called).toBe(0);
  });
});
