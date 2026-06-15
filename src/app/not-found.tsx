import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
      <p className="text-6xl md:text-7xl font-bold text-brand/80 dark:text-brand-light/80 tracking-tight mb-4">
        404
      </p>
      <h1 className="text-2xl md:text-3xl font-bold text-apple-gray-600 dark:text-dark-text tracking-tight mb-3">
        Seite nicht gefunden
      </h1>
      <p className="text-apple-gray-500 dark:text-apple-gray-300 mb-8 max-w-md mx-auto">
        Die gesuchte Seite existiert nicht oder wurde verschoben.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white font-semibold rounded-full shadow-apple hover:bg-brand-dark hover:shadow-apple-lg transition-all duration-300"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Zurück zum Hilfe-Center
      </Link>
    </div>
  );
}
