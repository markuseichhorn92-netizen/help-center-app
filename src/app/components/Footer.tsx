import Link from "next/link";
import Image from "next/image";
import HeaderShell from "./HeaderShell";
import { PHONE_DISPLAY, PHONE_HREF, WHATSAPP_URL } from "@/components/help/ContactBlock";

export default function Footer() {
  return (
    <HeaderShell>
      <footer className="lc-foot">
        <div className="lc-foot-grid">
          <div>
            <Image src="/fitinn-logo.png" alt="Fit-Inn Trier" width={2917} height={486} sizes="170px" className="h-7 w-auto brightness-0 invert" />
            <p className="mt-4 max-w-xs text-sm text-white/70">Fit-Inn Trier · Auf Hirtenberg 8 · 54296 Trier</p>
          </div>
          <nav aria-label="Hilfe">
            <h2>Hilfe</h2>
            <Link href="/chat">KI-Assistent fragen</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp schreiben</a>
            <a href={PHONE_HREF}>Telefon {PHONE_DISPLAY}</a>
            <a href="mailto:info@fit-inn-trier.de">info@fit-inn-trier.de</a>
            <Link href="/portal">Meine Anfragen</Link>
          </nav>
          <nav aria-label="Rechtliches">
            <h2>Fit-Inn</h2>
            <a href="https://fit-inn-trier.de">Zur Website</a>
            <Link href="/impressum">Impressum</Link>
            <Link href="/datenschutz">Datenschutz</Link>
            <a href="https://www.instagram.com/fit_inn_trier/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="https://www.facebook.com/FitInnFeyen" target="_blank" rel="noopener noreferrer">Facebook</a>
          </nav>
        </div>
        <div className="lc-foot-bottom">
          <div>
            <span>© {new Date().getFullYear()} Fit-Inn Trier</span>
            <Link href="/admin">Admin</Link>
          </div>
        </div>
      </footer>
    </HeaderShell>
  );
}
