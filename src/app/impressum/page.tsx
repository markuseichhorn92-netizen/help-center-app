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
        className="inline-flex items-center gap-2 text-apple-gray-400 hover:text-brand transition-colors mb-8"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span>Zurück zur Startseite</span>
      </Link>

      {/* Content */}
      <article className="prose prose-apple max-w-none">
        <h1 className="text-3xl md:text-4xl font-bold text-apple-gray-600 tracking-tight mb-8">
          Impressum
        </h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">Angaben gemäß § 5 TMG</h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-600 mb-2">
              <strong>Fit-Inn Trier</strong>
            </p>
            <p className="text-apple-gray-500">
              Auf Hirtenberg 8<br />
              54296 Trier
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">Kontakt</h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500 mb-2">
              <strong className="text-apple-gray-600">Telefon:</strong>{" "}
              <a href="tel:+49651308524" className="text-brand hover:underline">0651 308524</a>
            </p>
            <p className="text-apple-gray-500">
              <strong className="text-apple-gray-600">E-Mail:</strong>{" "}
              <a href="mailto:info@fit-inn-trier.de" className="text-brand hover:underline">info@fit-inn-trier.de</a>
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">Vertreten durch</h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500">
              <strong className="text-apple-gray-600">Geschäftsführer:</strong> Harald Eichhorn
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">Redaktionell verantwortlich</h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500">
              Markus Eichhorn<br />
              Auf Hirtenberg 8<br />
              54296 Trier
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">Berufshaftpflichtversicherung</h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500 mb-2">
              <strong className="text-apple-gray-600">Versicherer:</strong> AXA Versicherung AG
            </p>
            <p className="text-apple-gray-500 mb-2">
              <strong className="text-apple-gray-600">Anschrift:</strong> Colonia-Allee 10-20, 51067 Köln
            </p>
            <p className="text-apple-gray-500">
              <strong className="text-apple-gray-600">Geltungsraum:</strong> Deutschland
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">
            Zentrale Kontaktstelle nach dem Digital Services Act (DSA)
          </h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500 mb-2">
              <strong className="text-apple-gray-600">E-Mail:</strong>{" "}
              <a href="mailto:info@fit-inn-trier.de" className="text-brand hover:underline">info@fit-inn-trier.de</a>
            </p>
            <p className="text-apple-gray-500">
              <strong className="text-apple-gray-600">Sprachen:</strong> Deutsch, Englisch
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">EU-Streitschlichtung</h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500 mb-4">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
            </p>
            <p className="text-apple-gray-500 mb-4">
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline break-all"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
            </p>
            <p className="text-apple-gray-500">
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 mb-4">
            Verbraucherstreitbeilegung / Universalschlichtungsstelle
          </h2>
          <div className="bg-white rounded-apple-lg p-6 shadow-card border border-apple-gray-100">
            <p className="text-apple-gray-500">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </section>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t border-apple-gray-200">
          <p className="text-sm text-apple-gray-400 text-center">
            Fit-Inn Trier – Familienunternehmen seit 1996
          </p>
        </div>
      </article>
    </div>
  );
}
