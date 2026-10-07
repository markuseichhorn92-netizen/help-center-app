import Link from 'next/link';
import { PhoneIcon, SparkIcon, WhatsAppIcon, MailIcon } from './icons';
import { Reveal } from './Reveal';

export const WHATSAPP_URL = 'https://wa.me/4951328533010';
export const PHONE_DISPLAY = '0651 493 688 19';
export const PHONE_HREF = 'tel:+4965149368819';

// Kontakt-Fallback: KI-Assistent → WhatsApp → Telefon (Reihenfolge laut Konzept).
export default function ContactBlock({ title = 'Nichts gefunden?', hint, variant = 'card', idSuffix = 'main' }: {
  title?: string; hint?: string; variant?: 'card' | 'hero'; idSuffix?: string;
}) {
  const tid = `hc-contact-title-${idSuffix}`;
  const hero = variant === 'hero';
  return (
    <section aria-labelledby={tid} className={hero ? 'hc-contact-hero rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm' : 'hc-card p-5 sm:p-6'}>
      <h2 id={tid} className={`text-xl font-extrabold tracking-tight ${hero ? 'text-white' : ''}`}>{title}</h2>
      <p className={`mt-1 mb-4 text-sm ${hero ? 'text-[#cfe5ea]' : 'text-mut dark:text-[#9fb4ba]'}`}>
        {hint ?? 'Wähle den schnellsten Weg – Mitarbeitende sind für Persönliches da.'}
      </p>
      <div className="grid gap-2.5">
        <Reveal>
          <Link href="/chat" className="group flex min-h-14 items-center gap-3 rounded-xl bg-p7 px-4 py-3 font-bold text-white transition hover:-translate-y-0.5 hover:bg-p9 hover:shadow-lg active:translate-y-0 dark:bg-teal dark:text-[#06323c]">
            <SparkIcon className="text-xl" />
            <span>KI-Assistent fragen<small className="block text-xs font-medium opacity-85">Sofort-Antwort, rund um die Uhr</small></span>
          </Link>
        </Reveal>
        <Reveal delay={0.06}>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-3 rounded-xl bg-[#e8f6ee] px-4 py-3 font-bold text-ok transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
            <WhatsAppIcon className="text-xl" />
            <span>WhatsApp schreiben<small className="block text-xs font-medium opacity-85">Assistent antwortet zuerst · „Mitarbeiter“ holt das Team</small></span>
          </a>
        </Reveal>
        <Reveal delay={0.12}>
          <a href={PHONE_HREF} className={`flex min-h-14 items-center gap-3 rounded-xl border-[1.5px] px-4 py-3 font-bold transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${hero ? 'border-white/70 bg-transparent text-white' : 'border-p7 bg-white text-p7 dark:border-teal dark:bg-transparent dark:text-[#8ccbd9]'}`}>
            <PhoneIcon className="text-xl" />
            <span>Anrufen · {PHONE_DISPLAY}<small className="block text-xs font-medium opacity-85">Telefon</small></span>
          </a>
        </Reveal>
      </div>
      <p className={`mt-4 flex items-center gap-2 text-xs ${hero ? 'text-[#cfe5ea]' : 'text-mut dark:text-[#9fb4ba]'}`}>
        <MailIcon className="shrink-0" />
        <span>Lieber schriftlich? <a href="mailto:info@fit-inn-trier.de" className="font-semibold underline underline-offset-2">info@fit-inn-trier.de</a></span>
      </p>
    </section>
  );
}
