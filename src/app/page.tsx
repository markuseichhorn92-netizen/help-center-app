import Link from 'next/link';
import type { Metadata } from 'next';
import SearchBox from '@/components/help/SearchBox';
import ContactBlock from '@/components/help/ContactBlock';
import { CategoryIcon, ChevronIcon, DocIcon } from '@/components/help/icons';
import { getCategories, getOpeningConfig, getPublishedArticles, pickTopArticles } from '@/lib/help/data';
import { ldJson, organizationLd, websiteLd } from '@/lib/help/seo';
import { buildSearchDocs } from '@/lib/help/build';

export const revalidate = 60;

const APP_FITINN = 'https://angebot.fit-inn-trier.de/app/fitinn';
const APP_TECHNOGYM = 'https://angebot.fit-inn-trier.de/app/technogym';
const FITINN_APP_POINTS = ['Mitgliedschaft verwalten und pausieren', 'Check-in und Check-out', 'Punkte sammeln, Prämien und Partner-Gutscheine', 'Termine buchen, Auslastung sehen'];
const TECHNOGYM_APP_POINTS = ['Dein Trainingsplan', 'Dein Training', 'Anmeldung an den Geräten'];

export const metadata: Metadata = { alternates: { canonical: '/' } };

const CHIP_LABELS: [string, string][] = [
  ['kündigen', 'Vertrag kündigen'], ['öffnungszeiten', 'Öffnungszeiten'], ['pausieren', 'Pausieren'], ['probetraining', 'Probetraining'], ['technogym app', 'Technogym App'],
];

export default async function Home() {
  const [articles, categories, opening] = await Promise.all([getPublishedArticles(), getCategories(), getOpeningConfig()]);
  const docs = buildSearchDocs(articles, categories);
  const top = pickTopArticles(articles, 6);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const chips = CHIP_LABELS.flatMap(([k, label]) => {
    const a = articles.find((x) => x.title.toLowerCase().includes(k));
    return a ? [{ label, id: a.slug }] : [];
  });
  const tiles = categories
    .map((c) => ({ ...c, count: articles.filter((a) => a.category === c.id).length }))
    .filter((c) => c.count > 0);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([websiteLd(), organizationLd(opening)]) }} />
      <section className="lc-hero">
        <div className="lc-floor" aria-hidden />
        <div className="lc-wrap lc-hero-grid">
          <div>
            <h1 className="lc-h1">Wie können wir dir <span className="lc-em">helfen?</span></h1>
            <p className="lc-lead">Frag einfach – die Antwort ist meist nur einen Klick entfernt.</p>
            <SearchBox docs={docs} topIds={top.map((a) => a.slug)} chips={chips} />
          </div>
          <div className="relative hidden lg:block">
            <img className="lc-glas" src="/glas-hantel.svg" alt="" aria-hidden width={240} height={200} />
            <ContactBlock title="Lieber direkt fragen?" hint="Drei Wege – du wählst." idSuffix="hero" />
          </div>
        </div>
      </section>

      <section className="lc-section" aria-labelledby="top-fragen">
        <div className="lc-wrap">
          <h2 id="top-fragen" className="lc-h2">Häufige Fragen</h2>
          <ul className="lc-rows">
            {top.map((a) => (
              <li key={a.id} className="lc-row">
                <Link href={`/artikel/${a.slug}`}>
                  <span className="lc-ic"><DocIcon /></span>
                  <span><strong>{a.title}</strong></span>
                  <ChevronIcon className="lc-chev" />
                </Link>
              </li>
            ))}
          </ul>
          {catName.size === 0 && articles.length === 0 && (
            <p className="mt-4 text-sm text-mut">Die Artikel konnten gerade nicht geladen werden. Bitte versuche es gleich noch einmal.</p>
          )}
        </div>
      </section>

      <section className="lc-section" aria-labelledby="themen">
        <div className="lc-wrap">
          <h2 id="themen" className="lc-h2">Alle Themen</h2>
          <ul className="lc-cats">
            {tiles.map((c) => (
              <li key={c.id}>
                <Link href={`/kategorie/${c.slug}`} className="lc-cat">
                  <span className="lc-ic"><CategoryIcon icon={c.icon} /></span>
                  <strong>{c.name}</strong>
                  {c.description && <span className="lc-d">{c.description}</span>}
                  <span className="lc-n">{c.count} Artikel</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="lc-section" aria-labelledby="apps">
        <div className="lc-wrap">
          <h2 id="apps" className="lc-h2">Unsere Apps</h2>
          <p className="lc-sub">Zwei Apps, kostenlos – jede mit eigener Aufgabe.</p>
          <div className="lc-apps">
            <div className="lc-app">
              <div>
                <h3>Fit-Inn-App</h3>
                <p>Deine Mitgliedschaft in der Hosentasche.</p>
              </div>
              <ul>
                {FITINN_APP_POINTS.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <a className="lc-btn" href={APP_FITINN} rel="noopener">
                <span>Fit-Inn-App laden<small>iPhone und Android</small></span>
                <span className="lc-dot" aria-hidden />
              </a>
            </div>
            <div className="lc-app">
              <div>
                <h3>Technogym-App</h3>
                <p>Dein Training an den Geräten.</p>
              </div>
              <ul>
                {TECHNOGYM_APP_POINTS.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <a className="lc-btn" href={APP_TECHNOGYM} rel="noopener">
                <span>Technogym-App laden<small>iPhone und Android</small></span>
                <span className="lc-dot" aria-hidden />
              </a>
            </div>
          </div>
          <p className="lc-app-note">Alte Fit-Inn-App noch auf dem Handy? Bitte einmal löschen und die neue laden – ein normales Update ersetzt sie nicht.</p>
        </div>
      </section>

      <section className="lc-section lg:hidden">
        <div className="lc-wrap">
          <ContactBlock idSuffix="page" />
        </div>
      </section>
    </>
  );
}
