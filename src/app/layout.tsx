import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import Header from "./components/Header";

export const metadata: Metadata = {
  title: "FIT INN Hilfe-Center",
  description: "Das Hilfe-Center von FIT INN Trier",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased min-h-screen flex flex-col bg-apple-gray-50">
        {/* Glass Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Modern Footer */}
        <footer className="bg-apple-gray-600 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
              {/* Column 1: Logo & Address */}
              <div className="md:col-span-1 space-y-4">
                <img src="https://cdn.sanity.io/images/6qiktmvm/production/e33b949b11d3aa8b60befb3f5f537803a8c48700-2917x486.png" alt="FIT INN Logo" className="h-9 w-auto brightness-0 invert" />
                <div className="text-apple-gray-300 text-sm leading-relaxed">
                  <p>FIT INN Trier</p>
                  <p>Beispielstraße 1</p>
                  <p>12345 Trier</p>
                </div>
                <div className="text-apple-gray-300 text-sm">
                  <p>Tel: 0123-456789</p>
                  <p>info@fit-inn-trier.de</p>
                </div>
              </div>

              {/* Column 2: Rechtliches */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-apple-gray-300 mb-4">Rechtliches</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="#" className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                      Impressum
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                      Datenschutz
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                      AGB
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Kontakt */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-apple-gray-300 mb-4">Kontakt</h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/support" className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                      Support
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="text-white/70 text-sm hover:text-white transition-colors duration-200">
                      Feedback
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 4: Social Media */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-apple-gray-300 mb-4">Folge uns</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10 mt-10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-white/50 text-sm">
                &copy; {new Date().getFullYear()} FIT INN Trier. Alle Rechte vorbehalten.
              </p>
              <Link
                href="/admin"
                className="text-white/30 text-xs hover:text-white/60 transition-colors duration-200 flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Admin
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
