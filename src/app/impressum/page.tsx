import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impressum | FIT INN Hilfe-Center",
  description: "Impressum und rechtliche Informationen des FIT INN Hilfe-Centers",
};

export default function ImpressumPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 animate-fade-in">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-apple-gray-400 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light transition-colors mb-8"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Zurück zur Startseite</span>
      </Link>

      {/* Content */}
      <article className="prose prose-apple max-w-none">
        <h1 className="text-3xl md:text-4xl font-bold text-apple-gray-600 dark:text-dark-text tracking-tight mb-8">
          Impressum
        </h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">Angaben gemäß § 5 TMG</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-600 dark:text-dark-text mb-2">
              <strong>Fit-Inn Trier</strong>
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Auf Hirtenberg 8<br />
              54296 Trier
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">Kontakt</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-2">
              <strong className="text-apple-gray-600 dark:text-dark-text">Telefon:</strong>{" "}
              <a href="tel:+49651308524" className="text-brand dark:text-brand-light hover:underline">0651 308524</a>
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              <strong className="text-apple-gray-600 dark:text-dark-text">E-Mail:</strong>{" "}
              <a href="mailto:info@fit-inn-trier.de" className="text-brand dark:text-brand-light hover:underline">info@fit-inn-trier.de</a>
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">Vertreten durch</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              <strong className="text-apple-gray-600 dark:text-dark-text">Geschäftsführer:</strong> Harald Eichhorn
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">Redaktionell verantwortlich</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Markus Eichhorn<br />
              Auf Hirtenberg 8<br />
              54296 Trier
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">Berufshaftpflichtversicherung</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-2">
              <strong className="text-apple-gray-600 dark:text-dark-text">Versicherer:</strong> AXA Versicherung AG
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-2">
              <strong className="text-apple-gray-600 dark:text-dark-text">Anschrift:</strong> Colonia-Allee 10-20, 51067 Köln
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              <strong className="text-apple-gray-600 dark:text-dark-text">Geltungsraum:</strong> Deutschland
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">
            Zentrale Kontaktstelle nach dem Digital Services Act (DSA)
          </h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-2">
              <strong className="text-apple-gray-600 dark:text-dark-text">E-Mail:</strong>{" "}
              <a href="mailto:info@fit-inn-trier.de" className="text-brand dark:text-brand-light hover:underline">info@fit-inn-trier.de</a>
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              <strong className="text-apple-gray-600 dark:text-dark-text">Sprachen:</strong> Deutsch, Englisch
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">EU-Streitschlichtung</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand dark:text-brand-light hover:underline break-all"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">
            Verbraucherstreitbeilegung / Universalschlichtungsstelle
          </h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t border-apple-gray-200 dark:border-dark-border">
          <p className="text-sm text-apple-gray-400 dark:text-apple-gray-300 text-center">
            Fit-Inn Trier – Familienunternehmen seit 1996
          </p>
        </div>
      </article>
    </div>
  );
}
