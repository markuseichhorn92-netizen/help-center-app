import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ContactBlock from '@/components/help/ContactBlock';
import { Reveal } from '@/components/help/Reveal';
import { BackIcon, CategoryIcon, ChevronIcon, DocIcon } from '@/components/help/icons';
import { getCategories, getPublishedArticles, stripHtml } from '@/lib/help/data';

export const revalidate = 60;

export async function generateStaticParams() {
  return []; // On-Demand-ISR: Seite wird beim ersten Aufruf gerendert und dann 60 s gecacht
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = (await getCategories()).find((c) => c.slug === slug);
  return cat ? { title: cat.name, description: cat.description, alternates: { canonical: `/kategorie/${cat.slug}` } } : {};
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const [categories, articles] = await Promise.all([getCategories(), getPublishedArticles()]);
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();
  const list = articles.filter((a) => a.category === cat.id).sort((a, b) => a.title.localeCompare(b.title, 'de'));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/" className="mb-6 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-bold text-p7 transition hover:border-teal dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]">
        <BackIcon /> Zurück
      </Link>
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-soft text-3xl text-p7 dark:bg-[#12404b] dark:text-[#8ccbd9]"><CategoryIcon icon={cat.icon} /></span>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{cat.name}</h1>
          {cat.description && <p className="text-mut dark:text-[#9fb4ba]">{cat.description}</p>}
        </div>
      </div>
      <ul className="hc-card mt-8 overflow-hidden">
        {list.map((a, i) => (
          <li key={a.id} className="border-b border-line last:border-0 dark:border-[#1d4650]">
            <Reveal delay={Math.min(i, 6) * 0.04} y={8}>
              <Link href={`/artikel/${a.slug}`} className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-teal-soft/60 dark:hover:bg-[#12404b]/60">
                <DocIcon className="shrink-0 text-xl text-teal" />
                <span className="min-w-0 flex-1">
                  <strong className="block leading-snug">{a.title}</strong>
                  <span className="mt-0.5 line-clamp-1 block text-sm text-mut dark:text-[#9fb4ba]">{stripHtml(a.content).slice(0, 120)}</span>
                </span>
                <ChevronIcon className="shrink-0 text-[#9bb0b6] transition group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-mut">In diesem Thema gibt es noch keine Artikel.</li>}
      </ul>
      <div className="mt-10"><ContactBlock /></div>
    </div>
  );
}
