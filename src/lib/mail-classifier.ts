// Einordnung eingehender E-Mails: Kundenanfrage vs. Sonstiges (Newsletter, Werbung, Rechnungen, Systemmails).
// Grundsatz: im Zweifel Kundenanfrage – nichts darf untergehen. Spam wird weiterhin in spam-protection.ts erkannt.

export type MailCategory = 'kundenanfrage' | 'sonstiges';
export type ClassificationSource = 'rule' | 'ai' | 'learned' | 'default' | 'manual';

export interface MailClassification {
  category: MailCategory;
  reason: string;
  source: ClassificationSource;
  /** Bewerbungen o. Ä.: bleiben in der Ticketliste, aber als wichtig/intern markiert */
  important?: boolean;
}

export interface MailInfo {
  fromEmail: string;
  fromName?: string;
  subject: string;
  text: string;
  /** Kleingeschriebene Header-Namen, z. B. 'list-unsubscribe' */
  headers: Record<string, string>;
  attachmentNames: string[];
}

export interface LearnedSenders {
  sonstiges: Set<string>;
  kundenanfrage: Set<string>;
}

// KI-Funktion ist injizierbar (Tests ohne Netz)
export type AiClassifier = (mail: MailInfo) => Promise<{ category: MailCategory; reason: string } | null>;

const NOREPLY_LOCAL = /^(no[-_.]?reply|do[-_.]?not[-_.]?reply|donotreply|newsletter|news|mailer[-_.]?daemon|postmaster|bounces?|notifications?|notify|alerts?|marketing|system|automailer|auto[-_.]?reply)([-_.+].*)?$/i;

// Bekannte System-/Plattform-Absender (Domain bzw. Subdomain davon)
const SYSTEM_DOMAINS = [
  'vercel.com', 'github.com', 'google.com', 'facebookmail.com', 'meta.com', 'instagram.com', 'linkedin.com',
  'paypal.com', 'stripe.com', 'twilio.com', 'sendgrid.net', 'mailchimp.com', 'mcsv.net', 'rsgsv.net', 'hubspot.com',
  'amazonses.com', 'resend.com', 'resend.dev', 'ionos.de', 'ionos.com', '1und1.de', 'microsoft.com', 'office365.com',
  'apple.com', 'dropbox.com', 'zoom.us', 'canva.com', 'notion.so', 'sanity.io', 'cloudflare.com', 'hostinger.com',
  'magicline.com', 'magicline.de', 'tiktok.com', 'respond.io',
];

const AUTO_SUBJECT = /(newsletter|unsubscribe|abbestellen|webinar|sonderangebot|jetzt sichern|% rabatt|gutschein|sicherheitswarnung|security alert|verify your|passwort zurücksetzen|password reset|delivery status|undeliverable|automatische antwort|out of office|your receipt|auftragsbestätigung|bestellbestätigung)/i;
const INVOICE_SUBJECT = /(rechnung|invoice|rechnungsnr|beleg|gutschrift|lieferschein)/i;
const APPLICATION_SUBJECT = /(bewerbung|initiativbewerbung|stellenanfrage|ausbildungsplatz|minijob|praktikum|werkstudent)/i;

// Typische Kundenthemen – schützt vor falschem "Sonstiges"
const CUSTOMER_TOPIC = /(kündig|vertrag|mitgliedschaft|beitrag|lastschrift|probetraining|schnupper|kurs|öffnungszeit|beschwerde|reklamation|termin|schlüssel|chip|pausier|ruhend|bankverbindung|iban|check-?in|zugang|trainer|sauna|solarium|dusche|parkplatz)/i;

const FREEMAIL = /^(gmail\.com|googlemail\.com|gmx\.(de|net)|web\.de|t-online\.de|outlook\.(com|de)|hotmail\.\w+|yahoo\.\w+|icloud\.com|freenet\.de)$/;

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : '';
}

function isSystemDomain(domain: string): boolean {
  return SYSTEM_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

export function emptyLearned(): LearnedSenders {
  return { sonstiges: new Set(), kundenanfrage: new Set() };
}

/**
 * Einfache Regeln. Gibt null zurück, wenn unklar (dann KI bzw. Standard Kundenanfrage).
 * Reihenfolge: gelernte Absender > Bewerbung > Newsletter-Header > Auto-Submitted > noreply > Systemabsender > Rechnung.
 */
export function classifyByRules(mail: MailInfo, learned: LearnedSenders = emptyLearned()): MailClassification | null {
  const email = normalizeEmail(mail.fromEmail);
  const domain = domainOf(email);
  const local = email.split('@')[0] || '';
  const h = mail.headers;
  const subject = mail.subject || '';

  // 1. Von Markus/Team gemerkte Absender (Kundenanfrage gewinnt bei Doppeleintrag)
  if (learned.kundenanfrage.has(email)) {
    return { category: 'kundenanfrage', reason: 'Absender wurde als Kundenanfrage gemerkt', source: 'learned' };
  }
  if (learned.sonstiges.has(email)) {
    return { category: 'sonstiges', reason: 'Absender wurde als Sonstiges gemerkt', source: 'learned' };
  }

  // 2. Bewerbungen: nie verstecken, als wichtig/intern markieren
  if (APPLICATION_SUBJECT.test(subject)) {
    return { category: 'kundenanfrage', reason: 'Bewerbung/Stellenanfrage – wichtig/intern', source: 'rule', important: true };
  }

  const customerTopic = CUSTOMER_TOPIC.test(subject) || CUSTOMER_TOPIC.test(mail.text.slice(0, 600));

  // 3. Eindeutige Newsletter-/Massenmail-Header
  if (h['list-unsubscribe'] || h['list-id']) {
    return { category: 'sonstiges', reason: 'Newsletter-Header (List-Unsubscribe)', source: 'rule' };
  }
  if (/\b(bulk|list|junk)\b/i.test(h['precedence'] || '')) {
    return { category: 'sonstiges', reason: 'Massenmail-Header (Precedence: bulk)', source: 'rule' };
  }

  // 4. Automatische Benachrichtigungen
  const autoSubmitted = (h['auto-submitted'] || '').toLowerCase();
  if (autoSubmitted && autoSubmitted !== 'no') {
    return { category: 'sonstiges', reason: 'Automatische Benachrichtigung (Auto-Submitted)', source: 'rule' };
  }

  // 5. noreply/Newsletter-Absender
  if (NOREPLY_LOCAL.test(local)) {
    return { category: 'sonstiges', reason: 'noreply-/Newsletter-Absender', source: 'rule' };
  }

  // 6. Bekannte Systemabsender (außer es geht erkennbar um ein Kundenthema)
  if (isSystemDomain(domain) && !customerTopic) {
    return { category: 'sonstiges', reason: 'Bekannter System-/Plattform-Absender', source: 'rule' };
  }

  // 7. Rechnung als PDF von einer Firma
  const hasPdf = mail.attachmentNames.some((n) => /\.pdf$/i.test(n));
  const invoiceHint = INVOICE_SUBJECT.test(subject) || mail.attachmentNames.some((n) => INVOICE_SUBJECT.test(n));
  if (hasPdf && invoiceHint && !FREEMAIL.test(domain) && !customerTopic) {
    return { category: 'sonstiges', reason: 'Rechnung (PDF) von Firmenabsender', source: 'rule' };
  }

  return null;
}

/** Vollständige Einordnung: Regeln → KI (nur bei Verdacht) → Standard Kundenanfrage. */
export async function classifyEmail(
  mail: MailInfo,
  options: { learned?: LearnedSenders; ai?: AiClassifier } = {},
): Promise<MailClassification> {
  const byRule = classifyByRules(mail, options.learned);
  if (byRule) return byRule;

  // KI nur bei Verdacht – normale Mails gehen ohne Kosten als Kundenanfrage durch
  const local = (mail.fromEmail.split('@')[0] || '').toLowerCase();
  const suspicious =
    AUTO_SUBJECT.test(mail.subject) ||
    INVOICE_SUBJECT.test(mail.subject) ||
    /(unsubscribe|abmelden|abbestellen|newsletter)/i.test(mail.text.slice(-1200)) ||
    /^(info|kontakt|service|support|vertrieb|sales|office|hello|team)$/.test(local) ||
    /mailchimp|sendinblue|brevo|klaviyo|hubspot/i.test(mail.headers['x-mailer'] || '');

  if (suspicious && options.ai) {
    try {
      const res = await options.ai(mail);
      if (res) {
        return { category: res.category, reason: `KI: ${res.reason}`.slice(0, 200), source: 'ai' };
      }
    } catch {
      // KI-Fehler → Standard
    }
  }

  return { category: 'kundenanfrage', reason: 'Im Zweifel Kundenanfrage', source: 'default' };
}
