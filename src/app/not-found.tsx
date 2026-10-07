import Link from 'next/link';
import ContactBlock from '@/components/help/ContactBlock';
import { SearchIcon } from '@/components/help/icons';

export const metadata = { title: 'Seite nicht gefunden' };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:py-20">
      <p className="hc-eyebrow">Fehler 404</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Diese Seite gibt es nicht.</h1>
      <p className="mt-3 text-mut dark:text-[#9fb4ba]">Vielleicht wurde der Artikel verschoben oder der Link ist veraltet. Such einfach nach deinem Thema:</p>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-p7 px-5 font-bold text-white transition hover:bg-p9 dark:bg-teal dark:text-[#06323c]">
        <SearchIcon /> Zur Startseite mit Suche
      </Link>
      <div className="mt-10"><ContactBlock title="Oder frag direkt" /></div>
    </div>
  );
}
