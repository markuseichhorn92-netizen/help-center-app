import Link from "next/link";
import Image from "next/image";
import HeaderShell from "./HeaderShell";
import ThemeButton from "@/components/help/ThemeButton";
import OpenPill from "@/components/help/OpenPill";
import { getOpeningConfig } from "@/lib/help/data";

const pill = "hidden min-h-9 items-center rounded-full border border-line bg-white px-3 py-1.5 text-[13px] font-semibold text-p7 transition hover:border-teal sm:inline-flex dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]";

export default async function Header() {
  const opening = await getOpeningConfig();
  return (
    <HeaderShell>
      <header className="sticky top-0 z-50 border-b border-line bg-white/90 backdrop-blur dark:border-[#1d4650] dark:bg-[#07181d]/90">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/fitinn-logo.png" alt="Fit-Inn Trier" width={2917} height={486} priority sizes="170px" className="h-6 w-auto dark:brightness-0 dark:invert sm:h-7" />
            <span className="hidden text-base font-extrabold tracking-tight sm:inline">Hilfe-Center</span>
          </Link>
          <div className="flex-1" />
          <OpenPill data={opening} />
          <Link href="/portal" className={pill}>Meine Anfragen</Link>
          <a href="https://fit-inn-trier.de" className={pill}>Zur Website</a>
          <ThemeButton />
        </div>
        <OpenPill data={opening} compact />
      </header>
    </HeaderShell>
  );
}
