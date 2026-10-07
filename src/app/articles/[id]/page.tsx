import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ContactBlock from '@/components/help/ContactBlock';
import ArticleFeedback from '@/components/help/ArticleFeedback';
import ArticleEffects from '@/components/help/ArticleEffects';
import { Reveal } from '@/components/help/Reveal';
import { BackIcon, ChevronIcon, DocIcon } from '@/components/help/icons';
import { fmtDate, getArticle, getCategories, getPublishedArticles, readingMinutes, stripHtml } from '@/lib/help/data';
import { parseArticle } from '@/lib/help/article';

export const revalidate = 60;

export async function generateStaticParams() {
  return []; // On-Demand-ISR: Seite wird beim ersten Aufruf gerendert und dann 60 s gecacht
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const a = await getArticle(id);
  if (!a) return { title: 'Artikel nicht gefunden' };
  const description = stripHtml(a.content).slice(0, 155).replace(/\s\S*$/, '') + ' …';
  return {
    title: a.title,
    description,
    alternates: { canonical: `/articles/${id}` },
    openGraph: { title: a.title, description, type: 'article', url: `/articles/${id}`, modifiedTime: a.updatedAt },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;
  const [article, all, categories] = await Promise.all([getArticle(id), getPublishedArticles(), getCategories()]);
  if (!article) notFound();

  const cat = categories.find((c) => c.id === article.category);
  const parsed = parseArticle(article.content);
  const minutes = readingMinutes(article.content);
  const sameCat = all.filter((a) => a.id !== id && a.category === article.category);
  const related = [...sameCat, ...all.filter((a) => a.id !== id && a.category !== article.category)].slice(0, 3);
  const prose = 'hc-prose text-ink dark:text-[#e8f1f3]';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article', headline: article.title,
    dateModified: article.updatedAt, datePublished: article.createdAt, inLanguage: 'de',
    publisher: { '@type': 'Organization', name: 'Fit-Inn Trier' },
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ArticleEffects articleId={id} />
      <Link href={cat ? `/kategorie/${cat.id}` : '/'} className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-bold text-p7 transition hover:border-teal dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]">
        <BackIcon /> {cat ? cat.name : 'Zurück'}
      </Link>

      <nav aria-label="Brotkrumen" className="text-sm text-mut dark:text-[#9fb4ba]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="underline-offset-2 hover:underline">Hilfe-Center</Link></li>
          {cat && (<><li aria-hidden>›</li><li><Link href={`/kategorie/${cat.id}`} className="underline-offset-2 hover:underline">{cat.name}</Link></li></>)}
          <li aria-hidden>›</li><li aria-current="page" className="font-semibold text-ink dark:text-[#e8f1f3]">{article.title}</li>
        </ol>
      </nav>

      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
      <p className="mt-2 text-sm text-mut dark:text-[#9fb4ba]">
        Aktualisiert am {fmtDate(article.updatedAt)} · ca. {minutes} Min. Lesezeit
      </p>

      {parsed.kurz && (
        <Reveal className="mt-6">
          <p className="rounded-2xl border-l-4 border-teal bg-teal-soft p-4 text-base leading-relaxed dark:bg-[#12404b]">
            <strong>Kurz gesagt:</strong> {parsed.kurz}
          </p>
        </Reveal>
      )}

      {parsed.headings.length >= 3 && (
        <nav aria-label="Inhalt" className="mt-6 flex flex-wrap gap-2">
          {parsed.headings.map((h) => (
            <a key={h.id} href={`#${h.id}`} className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-p7 transition hover:border-teal dark:border-[#1d4650] dark:bg-transparent dark:text-[#8ccbd9]">{h.text}</a>
          ))}
        </nav>
      )}

      {parsed.introHtml && <div className={`${prose} mt-6`} dangerouslySetInnerHTML={{ __html: parsed.introHtml }} />}

      {parsed.sections.length > 0 && (
        <div className="mt-6 grid gap-3">
          {parsed.sections.map((s, i) => (
            <Reveal key={s.id}>
              <section id={s.id} aria-labelledby={`${s.id}-h`} className="hc-card p-5">
                <h2 id={`${s.id}-h`} className="flex items-center gap-3 text-xl font-extrabold">
                  {parsed.numbered && (
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-p7 text-base text-white dark:bg-teal dark:text-[#06323c]">{i + 1}</span>
                  )}
                  {s.title}
                </h2>
                <div className={`${prose} mt-3`} dangerouslySetInnerHTML={{ __html: s.html }} />
              </section>
            </Reveal>
          ))}
        </div>
      )}

      <div className="mt-8">
        <ArticleFeedback articleId={id} contact={<ContactBlock title="Wir helfen dir weiter" idSuffix="feedback" />} />
      </div>

      {related.length > 0 && (
        <section aria-labelledby="passt" className="mt-10">
          <h2 id="passt" className="hc-eyebrow mb-3">Passt dazu</h2>
          <ul className="hc-card overflow-hidden">
            {related.map((a) => (
              <li key={a.id} className="border-b border-line last:border-0 dark:border-[#1d4650]">
                <Link href={`/articles/${a.id}`} className="group flex min-h-14 items-center gap-3 px-4 py-3 font-bold transition-colors hover:bg-teal-soft/60 dark:hover:bg-[#12404b]/60">
                  <DocIcon className="shrink-0 text-lg text-teal" />
                  <span className="min-w-0 flex-1 leading-snug">{a.title}</span>
                  <ChevronIcon className="shrink-0 text-[#9bb0b6] transition group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10">
        <ContactBlock hint="Wähle den schnellsten Weg – bei Fragen zur Mitgliedschaft halte bitte deine Mitgliedsnummer bereit." idSuffix="article" />
      </div>
    </article>
  );
}
