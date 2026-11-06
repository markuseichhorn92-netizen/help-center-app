import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ContactBlock from '@/components/help/ContactBlock';
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
    <div className="lc-wrap lc-narrow pb-6">
      <div className="lc-pagehead">
        <Link href="/" className="lc-back"><BackIcon /> Zurück</Link>
        <div className="lc-cathead">
          <span className="lc-ic"><CategoryIcon icon={cat.icon} /></span>
          <div>
            <h1 className="lc-title">{cat.name}</h1>
            {cat.description && <p className="lc-meta" style={{ marginTop: 6 }}>{cat.description}</p>}
          </div>
        </div>
      </div>
      <ul className="lc-rows" style={{ marginTop: 22 }}>
        {list.map((a) => (
          <li key={a.id} className="lc-row">
            <Link href={`/artikel/${a.slug}`}>
              <span className="lc-ic"><DocIcon /></span>
              <span>
                <strong>{a.title}</strong>
                <small>{stripHtml(a.content).slice(0, 120)}</small>
              </span>
              <ChevronIcon className="lc-chev" />
            </Link>
          </li>
        ))}
        {list.length === 0 && <li className="py-6 text-mut">In diesem Thema gibt es noch keine Artikel.</li>}
      </ul>
      <div className="mt-10"><ContactBlock /></div>
    </div>
  );
}
