import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { PageTracker } from "@/components/PageTracker";

// Optimized font loading with next/font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FIT INN Hilfe-Center",
  description: "Das Hilfe-Center von FIT INN Trier",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FIT INN Admin",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a4958",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-apple-gray-50 dark:bg-dark-bg font-sans transition-colors duration-300">
        {/* Glass Header */}
        <Header />

        {/* Main Content */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer */}
        <Footer />

        {/* Cookie Banner */}
        <CookieBanner />

        {/* Anonymous Page Tracking (no cookies, DSGVO-konform) */}
        <PageTracker />

        {/* respond.io Live Chat Widget - lazy-loaded so it never blocks interactivity */}
        <Script
          id="respondio__growth_tool"
          src="https://cdn.respond.io/widget/widget.js?wId=c870a85b-64c0-463d-a46c-faeefd1b0c3e"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
