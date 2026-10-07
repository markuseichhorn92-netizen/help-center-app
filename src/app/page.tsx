import Link from 'next/link';
import type { Metadata } from 'next';
import SearchBox from '@/components/help/SearchBox';
import ContactBlock from '@/components/help/ContactBlock';
import { Reveal } from '@/components/help/Reveal';
import { CategoryIcon, ChevronIcon, DocIcon, UserIcon } from '@/components/help/icons';
import { getCategories, getPublishedArticles, pickTopArticles } from '@/lib/help/data';
import { buildSearchDocs } from '@/lib/help/build';
import HeroTitle from '@/components/help/HeroTitle';

export const revalidate = 60;

export const metadata: Metadata = { alternates: { canonical: '/' } };

const CHIP_LABELS: [string, string][] = [
  ['kündigen', 'Vertrag kündigen'], ['öffnungszeiten', 'Öffnungszeiten'], ['pausieren', 'Pausieren'], ['probetraining', 'Probetraining'], ['technogym app', 'Technogym App'],
];

export default async function Home() {
  const [articles, categories] = await Promise.all([getPublishedArticles(), getCategories()]);
  const docs = buildSearchDocs(articles, categories);
  const top = pickTopArticles(articles, 6);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const chips = CHIP_LABELS.flatMap(([k, label]) => {
    const a = articles.find((x) => x.title.toLowerCase().includes(k));
    return a ? [{ label, id: a.id }] : [];
  });
  const tiles = categories
    .map((c) => ({ ...c, count: articles.filter((a) => a.category === c.id).length }))
    .filter((c) => c.count > 0);

  return (
    <>
      <section className="hc-hero">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-12">
          <div>
            <HeroTitle />
            <div className="mt-6">
              <SearchBox docs={docs} topIds={top.map((a) => a.id)} chips={chips} />
            </div>
          </div>
          <div className="hidden lg:block">
            <ContactBlock variant="hero" title="Lieber direkt fragen?" hint="Drei Wege – du wählst." idSuffix="hero" />
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:py-14">
        <section aria-labelledby="themen">
          <h2 id="themen" className="hc-eyebrow mb-3">Themen</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
            {tiles.map((c, i) => (
              <Reveal as="li" key={c.id} delay={i * 0.05}>
                <Link href={`/kategorie/${c.id}`} className="hc-card group flex h-full min-h-32 flex-col gap-2 p-4 transition duration-200 hover:-translate-y-1 hover:border-teal hover:shadow-[0_10px_28px_rgba(9,75,90,.14)] active:translate-y-0">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-soft text-xl text-p7 transition group-hover:scale-110 dark:bg-[#12404b] dark:text-[#8ccbd9]"><CategoryIcon icon={c.icon} /></span>
                  <strong className="text-base leading-tight">{c.name}</strong>
                  <span className="text-xs text-mut dark:text-[#9fb4ba]">{c.description || `${c.count} Artikel`}</span>
                </Link>
              </Reveal>
            ))}
            <Reveal as="li" delay={tiles.length * 0.05}>
              <Link href="/portal" className="hc-card group flex h-full min-h-32 flex-col gap-2 p-4 transition duration-200 hover:-translate-y-1 hover:border-teal hover:shadow-[0_10px_28px_rgba(9,75,90,.14)] active:translate-y-0">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-soft text-xl text-p7 transition group-hover:scale-110 dark:bg-[#12404b] dark:text-[#8ccbd9]"><UserIcon /></span>
                <strong className="text-base leading-tight">Meine Anfragen</strong>
                <span className="text-xs text-mut dark:text-[#9fb4ba]">Tickets ansehen</span>
              </Link>
            </Reveal>
          </ul>
        </section>

        <section aria-labelledby="top-fragen">
          <h2 id="top-fragen" className="hc-eyebrow mb-3">Häufige Fragen</h2>
          <Reveal>
            <ul className="hc-card overflow-hidden">
              {top.map((a) => (
                <li key={a.id} className="border-b border-line last:border-0 dark:border-[#1d4650]">
                  <Link href={`/articles/${a.id}`} className="group flex min-h-14 items-center gap-3 px-4 py-3 font-bold transition-colors hover:bg-teal-soft/60 dark:hover:bg-[#12404b]/60">
                    <DocIcon className="shrink-0 text-lg text-teal" />
                    <span className="min-w-0 flex-1 leading-snug">{a.title}</span>
                    <ChevronIcon className="shrink-0 text-[#9bb0b6] transition group-hover:translate-x-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
          {catName.size === 0 && articles.length === 0 && (
            <p className="mt-4 text-sm text-mut">Die Artikel konnten gerade nicht geladen werden. Bitte versuche es gleich noch einmal.</p>
          )}
        </section>

        <div className="lg:hidden">
          <ContactBlock idSuffix="page" />
        </div>
      </div>
    </>
  );
}
