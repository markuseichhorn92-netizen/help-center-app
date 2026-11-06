import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ContactBlock from '@/components/help/ContactBlock';
import ArticleFeedback from '@/components/help/ArticleFeedback';
import ArticleEffects from '@/components/help/ArticleEffects';
import { BackIcon, ChevronIcon, DocIcon } from '@/components/help/icons';
import { fmtDate, getArticleBySlug, getCategories, getPublishedArticles, readingMinutes, stripHtml } from '@/lib/help/data';
import { parseArticle } from '@/lib/help/article';
import { articleLds, ldJson, shortAnswer } from '@/lib/help/seo';

export const revalidate = 60;

export async function generateStaticParams() {
  return []; // On-Demand-ISR: Seite wird beim ersten Aufruf gerendert und dann 60 s gecacht
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticleBySlug(slug);
  if (!a) return { title: 'Artikel nicht gefunden' };
  const description = stripHtml(a.content).slice(0, 155).replace(/\s\S*$/, '') + ' …';
  return {
    title: a.title,
    description,
    alternates: { canonical: `/artikel/${a.slug}`, types: { 'text/markdown': `/artikel/${a.slug}.md` } },
    openGraph: { title: a.title, description, type: 'article', url: `/artikel/${a.slug}`, publishedTime: a.createdAt, modifiedTime: a.updatedAt },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const [article, all, categories] = await Promise.all([getArticleBySlug(slug), getPublishedArticles(), getCategories()]);
  if (!article) notFound();
  const id = article.id;

  const cat = categories.find((c) => c.id === article.category);
  const parsed = parseArticle(article.content);
  const minutes = readingMinutes(article.content);
  const sameCat = all.filter((a) => a.id !== id && a.category === article.category);
  const related = [...sameCat, ...all.filter((a) => a.id !== id && a.category !== article.category)].slice(0, 3);
  const prose = 'hc-prose';

  const jsonLd = articleLds(article, cat, shortAnswer(article.content, parsed.kurz));

  return (
    <article className="lc-wrap lc-narrow pb-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }} />
      <ArticleEffects articleId={id} />
      <div className="lc-pagehead">
        <Link href={cat ? `/kategorie/${cat.slug}` : '/'} className="lc-back"><BackIcon /> {cat ? cat.name : 'Zurück'}</Link>

        <nav aria-label="Brotkrumen" className="lc-crumbs">
          <ol>
            <li><Link href="/">Hilfe-Center</Link></li>
            {cat && (<><li aria-hidden>›</li><li><Link href={`/kategorie/${cat.slug}`}>{cat.name}</Link></li></>)}
            <li aria-hidden>›</li><li aria-current="page" className="font-bold text-ink">{article.title}</li>
          </ol>
        </nav>

        <h1 className="lc-title" style={{ marginTop: 14 }}>{article.title}</h1>
        <p className="lc-meta">
          Aktualisiert am <time dateTime={article.updatedAt}>{fmtDate(article.updatedAt)}</time> · ca. {minutes} Min. Lesezeit
        </p>
      </div>

      {parsed.kurz && (
        <p className="lc-kurz"><strong>Kurz gesagt:</strong> {parsed.kurz}</p>
      )}

      {parsed.headings.length >= 3 && (
        <nav aria-label="Inhalt" className="lc-toc">
          {parsed.headings.map((h) => (
            <a key={h.id} href={`#${h.id}`}>{h.text}</a>
          ))}
        </nav>
      )}

      {parsed.introHtml && <div className={`${prose} mt-6`} dangerouslySetInnerHTML={{ __html: parsed.introHtml }} />}

      {parsed.sections.length > 0 && (
        <div className="mt-6 grid gap-4">
          {parsed.sections.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="lc-step">
              <h2 id={`${s.id}-h`}>
                {parsed.numbered && <span aria-hidden className="lc-num">{i + 1}</span>}
                {s.title}
              </h2>
              <div className={`${prose} mt-4`} dangerouslySetInnerHTML={{ __html: s.html }} />
            </section>
          ))}
        </div>
      )}

      <div className="mt-8">
        <ArticleFeedback articleId={id} contact={<ContactBlock title="Wir helfen dir weiter" idSuffix="feedback" />} />
      </div>

      {related.length > 0 && (
        <section aria-labelledby="passt" className="mt-12">
          <h2 id="passt" className="lc-h2">Passt dazu</h2>
          <ul className="lc-rows">
            {related.map((a) => (
              <li key={a.id} className="lc-row">
                <Link href={`/artikel/${a.slug}`}>
                  <span className="lc-ic"><DocIcon /></span>
                  <span><strong>{a.title}</strong></span>
                  <ChevronIcon className="lc-chev" />
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
