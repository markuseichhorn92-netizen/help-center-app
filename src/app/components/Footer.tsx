import Link from "next/link";
import Image from "next/image";
import HeaderShell from "./HeaderShell";
import { PHONE_DISPLAY, PHONE_HREF, WHATSAPP_URL } from "@/components/help/ContactBlock";

const link = "inline-flex min-h-9 items-center text-sm text-white/80 underline-offset-4 hover:text-white hover:underline";

export default function Footer() {
  return (
    <HeaderShell>
      <footer className="mt-16 bg-p9 text-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
          <div>
            <Image src="/fitinn-logo.png" alt="Fit-Inn Trier" width={2917} height={486} sizes="170px" className="h-7 w-auto brightness-0 invert" />
            <p className="mt-4 max-w-xs text-sm text-white/70">Fit-Inn Trier · Auf Hirtenberg 8 · 54296 Trier</p>
          </div>
          <nav aria-label="Hilfe" className="grid content-start gap-1">
            <h2 className="hc-eyebrow mb-2 !text-white/60">Hilfe</h2>
            <Link href="/chat" className={link}>KI-Assistent fragen</Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp schreiben</a>
            <a href={PHONE_HREF} className={link}>Telefon {PHONE_DISPLAY}</a>
            <a href="mailto:info@fit-inn-trier.de" className={link}>info@fit-inn-trier.de</a>
            <Link href="/portal" className={link}>Meine Anfragen</Link>
          </nav>
          <nav aria-label="Rechtliches" className="grid content-start gap-1">
            <h2 className="hc-eyebrow mb-2 !text-white/60">Fit-Inn</h2>
            <a href="https://fit-inn-trier.de" className={link}>Zur Website</a>
            <Link href="/impressum" className={link}>Impressum</Link>
            <Link href="/datenschutz" className={link}>Datenschutz</Link>
            <a href="https://www.instagram.com/fit_inn_trier/" target="_blank" rel="noopener noreferrer" className={link}>Instagram</a>
            <a href="https://www.facebook.com/FitInnFeyen" target="_blank" rel="noopener noreferrer" className={link}>Facebook</a>
          </nav>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-white/60 sm:px-6">
            <span>© {new Date().getFullYear()} Fit-Inn Trier</span>
            <Link href="/admin" className="text-white/40 hover:text-white/70">Admin</Link>
          </div>
        </div>
      </footer>
    </HeaderShell>
  );
}
