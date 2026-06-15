import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | FIT INN Hilfe-Center",
  description: "Datenschutzerklärung des FIT INN Hilfe-Centers",
};

export default function DatenschutzPage() {
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
          Datenschutzerklärung
        </h1>

        {/* Verantwortlicher */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">1. Verantwortlicher</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-600 dark:text-dark-text mb-2">
              <strong>Fit-Inn Trier Fitnessstudio</strong>
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-2">
              Auf Hirtenberg 8<br />
              54296 Trier
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-1">
              <strong className="text-apple-gray-600 dark:text-dark-text">Telefon:</strong>{" "}
              <a href="tel:+49651308524" className="text-brand dark:text-brand-light hover:underline">0651 308524</a>
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              <strong className="text-apple-gray-600 dark:text-dark-text">E-Mail:</strong>{" "}
              <a href="mailto:info@fit-inn-trier.de" className="text-brand dark:text-brand-light hover:underline">info@fit-inn-trier.de</a>
            </p>
          </div>
        </section>

        {/* Übersicht */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">2. Übersicht der Verarbeitungen</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer
              Verarbeitung zusammen und verweist auf die betroffenen Personen.
            </p>
            <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text mb-2">Arten der verarbeiteten Daten</h3>
            <ul className="list-disc list-inside text-apple-gray-500 dark:text-apple-gray-300 space-y-1 mb-4">
              <li>Bestandsdaten (z.B. Namen, Adressen)</li>
              <li>Kontaktdaten (z.B. E-Mail, Telefonnummern)</li>
              <li>Inhaltsdaten (z.B. Eingaben in Formularen)</li>
              <li>Nutzungsdaten (z.B. besuchte Seiten, Zugriffszeiten)</li>
              <li>Meta-/Kommunikationsdaten (z.B. Geräte-Informationen, IP-Adressen)</li>
            </ul>
            <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text mb-2">Kategorien betroffener Personen</h3>
            <ul className="list-disc list-inside text-apple-gray-500 dark:text-apple-gray-300 space-y-1">
              <li>Nutzer (z.B. Webseitenbesucher, Nutzer von Onlinediensten)</li>
            </ul>
          </div>
        </section>

        {/* Rechtsgrundlagen */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">3. Rechtsgrundlagen</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Im Folgenden erhalten Sie eine Übersicht der Rechtsgrundlagen der DSGVO, auf deren Basis
              wir personenbezogene Daten verarbeiten:
            </p>
            <ul className="space-y-3 text-apple-gray-500 dark:text-apple-gray-300">
              <li>
                <strong className="text-apple-gray-600 dark:text-dark-text">Einwilligung (Art. 6 Abs. 1 S. 1 lit. a DSGVO):</strong>{" "}
                Die betroffene Person hat ihre Einwilligung in die Verarbeitung gegeben.
              </li>
              <li>
                <strong className="text-apple-gray-600 dark:text-dark-text">Vertragserfüllung (Art. 6 Abs. 1 S. 1 lit. b DSGVO):</strong>{" "}
                Die Verarbeitung ist für die Erfüllung eines Vertrags erforderlich.
              </li>
              <li>
                <strong className="text-apple-gray-600 dark:text-dark-text">Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f DSGVO):</strong>{" "}
                Die Verarbeitung ist zur Wahrung unserer berechtigten Interessen erforderlich.
              </li>
            </ul>
          </div>
        </section>

        {/* Hosting */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">4. Hosting</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Unser Hilfe-Center wird bei Vercel Inc. gehostet. Der Anbieter ist Vercel Inc.,
              340 S Lemon Ave #4133, Walnut, CA 91789, USA.
            </p>
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Bei jedem Aufruf unserer Website erfasst Vercel automatisch Informationen in
              sogenannten Server-Log-Dateien, die Ihr Browser automatisch übermittelt. Dies sind:
            </p>
            <ul className="list-disc list-inside text-apple-gray-500 dark:text-apple-gray-300 space-y-1 mb-4">
              <li>Browsertyp und Browserversion</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse</li>
            </ul>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Weitere Informationen zum Datenschutz bei Vercel finden Sie unter:{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand dark:text-brand-light hover:underline"
              >
                https://vercel.com/legal/privacy-policy
              </a>
            </p>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">5. Cookies</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Wir setzen Cookies ein. Cookies sind kleine Textdateien, die auf Ihrem Endgerät
              gespeichert werden und bestimmte Einstellungen und Daten zum Austausch mit unserem
              System speichern.
            </p>
            <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text mb-2">Arten von Cookies</h3>
            <ul className="space-y-3 text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              <li>
                <strong className="text-apple-gray-600 dark:text-dark-text">Notwendige Cookies:</strong>{" "}
                Diese Cookies sind für den Betrieb der Website unbedingt erforderlich (z.B. Session-Cookies für den Admin-Bereich).
              </li>
              <li>
                <strong className="text-apple-gray-600 dark:text-dark-text">Analyse-Cookies:</strong>{" "}
                Mit Ihrer Einwilligung setzen wir Cookies ein, um anonyme Statistiken über die
                Nutzung unserer Website zu erheben.
              </li>
            </ul>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Sie können Ihre Cookie-Einstellungen jederzeit über das Cookie-Banner anpassen oder
              Cookies in Ihren Browsereinstellungen blockieren.
            </p>
          </div>
        </section>

        {/* Datenerfassung */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">6. Datenerfassung auf dieser Website</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text mb-2">Kontaktformular / Support-Tickets</h3>
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Wenn Sie uns per Kontaktformular oder Support-Ticket Anfragen zukommen lassen, werden
              Ihre Angaben aus dem Formular inklusive der von Ihnen dort angegebenen Kontaktdaten
              zwecks Bearbeitung der Anfrage und für den Fall von Anschlussfragen bei uns gespeichert.
              Diese Daten geben wir nicht ohne Ihre Einwilligung weiter.
            </p>
            <h3 className="font-semibold text-apple-gray-600 dark:text-dark-text mb-2">Artikel-Feedback</h3>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Bei der Bewertung von Hilfe-Artikeln ("War dieser Artikel hilfreich?") speichern wir
              nur anonyme Zähler. Es werden keine personenbezogenen Daten erfasst.
            </p>
          </div>
        </section>

        {/* Betroffenenrechte */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">7. Ihre Rechte</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:
            </p>
            <ul className="space-y-2 text-apple-gray-500 dark:text-apple-gray-300 mb-4">
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-brand dark:text-brand-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong className="text-apple-gray-600 dark:text-dark-text">Auskunftsrecht:</strong> Sie können Auskunft über Ihre von uns verarbeiteten Daten verlangen.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-brand dark:text-brand-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong className="text-apple-gray-600 dark:text-dark-text">Berichtigungsrecht:</strong> Sie können die Berichtigung unrichtiger Daten verlangen.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-brand dark:text-brand-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong className="text-apple-gray-600 dark:text-dark-text">Löschungsrecht:</strong> Sie können die Löschung Ihrer Daten verlangen.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-brand dark:text-brand-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong className="text-apple-gray-600 dark:text-dark-text">Einschränkung:</strong> Sie können die Einschränkung der Verarbeitung verlangen.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-brand dark:text-brand-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong className="text-apple-gray-600 dark:text-dark-text">Datenübertragbarkeit:</strong> Sie können verlangen, Ihre Daten in einem übertragbaren Format zu erhalten.</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-5 h-5 text-brand dark:text-brand-light flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span><strong className="text-apple-gray-600 dark:text-dark-text">Widerspruchsrecht:</strong> Sie können der Verarbeitung Ihrer Daten widersprechen.</span>
              </li>
            </ul>
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
              Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren.
            </p>
          </div>
        </section>

        {/* Widerruf */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">8. Widerruf Ihrer Einwilligung</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich.
              Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit
              der bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
              Für den Widerruf genügt eine formlose Mitteilung per E-Mail an{" "}
              <a href="mailto:info@fit-inn-trier.de" className="text-brand dark:text-brand-light hover:underline">
                info@fit-inn-trier.de
              </a>.
            </p>
          </div>
        </section>

        {/* Aktualität */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-apple-gray-600 dark:text-dark-text mb-4">9. Aktualität und Änderung</h2>
          <div className="bg-white dark:bg-dark-surface rounded-apple-lg p-6 shadow-card border border-apple-gray-100 dark:border-dark-border">
            <p className="text-apple-gray-500 dark:text-apple-gray-300">
              Diese Datenschutzerklärung ist aktuell gültig und hat den Stand Januar 2025.
              Durch die Weiterentwicklung unserer Website oder aufgrund geänderter gesetzlicher
              beziehungsweise behördlicher Vorgaben kann es notwendig werden, diese Datenschutzerklärung
              zu ändern.
            </p>
          </div>
        </section>

        {/* Footer Note */}
        <div className="mt-12 pt-8 border-t border-apple-gray-200 dark:border-dark-border">
          <p className="text-sm text-apple-gray-400 dark:text-apple-gray-300 text-center">
            Bei Fragen zum Datenschutz kontaktieren Sie uns unter{" "}
            <a href="mailto:info@fit-inn-trier.de" className="text-brand dark:text-brand-light hover:underline">
              info@fit-inn-trier.de
            </a>
          </p>
        </div>
      </article>
    </div>
  );
}
