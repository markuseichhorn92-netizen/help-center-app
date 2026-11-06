import Link from 'next/link';
import { PhoneIcon, SparkIcon, WhatsAppIcon, MailIcon } from './icons';

export const WHATSAPP_URL = 'https://wa.me/4951328533010';
export const PHONE_DISPLAY = '0651 603 443 42';
export const PHONE_HREF = 'tel:+4965160344342';

// Kontakt-Fallback: KI-Assistent → WhatsApp → Telefon (Reihenfolge laut Konzept).
export default function ContactBlock({ title = 'Nichts gefunden?', hint, idSuffix = 'main' }: {
  title?: string; hint?: string; variant?: 'card' | 'hero'; idSuffix?: string;
}) {
  const tid = `hc-contact-title-${idSuffix}`;
  return (
    <section aria-labelledby={tid} className="lc-contact">
      <h2 id={tid}>{title}</h2>
      <p>{hint ?? 'Wähle den schnellsten Weg – Mitarbeitende sind für Persönliches da.'}</p>
      <div className="lc-contact-ways">
        <Link href="/chat" className="lc-way is-main">
          <span className="lc-ic"><SparkIcon /></span>
          <span>KI-Assistent fragen<small>Sofort-Antwort, rund um die Uhr</small></span>
        </Link>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="lc-way">
          <span className="lc-ic"><WhatsAppIcon /></span>
          <span>WhatsApp schreiben<small>Assistent antwortet zuerst · „Mitarbeiter“ holt das Team</small></span>
        </a>
        <a href={PHONE_HREF} className="lc-way">
          <span className="lc-ic"><PhoneIcon /></span>
          <span>Anrufen · {PHONE_DISPLAY}<small>Telefon</small></span>
        </a>
      </div>
      <p className="lc-mail">
        <MailIcon className="shrink-0" />
        <span>Lieber schriftlich? <a href="mailto:info@fit-inn-trier.de">info@fit-inn-trier.de</a></span>
      </p>
    </section>
  );
}
