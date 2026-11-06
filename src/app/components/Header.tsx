import Link from "next/link";
import Image from "next/image";
import HeaderShell from "./HeaderShell";
import OpenPill from "@/components/help/OpenPill";
import { getOpeningConfig } from "@/lib/help/data";

export default async function Header() {
  const opening = await getOpeningConfig();
  return (
    <HeaderShell>
      <header className="lc-top">
        <div className="lc-nav">
          <Link href="/" className="lc-logo">
            <Image src="/fitinn-logo.png" alt="Fit-Inn Trier" width={2917} height={486} priority sizes="170px" />
            <span>Hilfe-Center</span>
          </Link>
          <div className="flex-1" />
          <OpenPill data={opening} />
          <Link href="/portal" className="lc-pill lc-hide-m">Meine Anfragen</Link>
          <a href="https://fit-inn-trier.de" className="lc-pill lc-hide-m">Zur Website</a>
          <Link href="/portal" className="lc-pill lc-only-m">Meine Anfragen</Link>
        </div>
        <OpenPill data={opening} compact />
      </header>
    </HeaderShell>
  );
}
