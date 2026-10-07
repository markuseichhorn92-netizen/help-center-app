/// <reference types="react/experimental" />
import { ViewTransition } from "react";
import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieBanner from "@/components/CookieBanner";
import { PageTracker } from "@/components/PageTracker";
import MotionProvider from "@/components/MotionProvider";

const archivo = Archivo({ subsets: ["latin"], display: "swap", variable: "--font-archivo" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], display: "swap", weight: ["500"], variable: "--font-plex" });

const SITE = "https://hilfe.fit-inn-trier.de";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Hilfe-Center | Fit-Inn Trier", template: "%s | Hilfe-Center Fit-Inn Trier" },
  description: "Antworten rund um deine Mitgliedschaft, Öffnungszeiten und das Training im Fit-Inn Trier – oder frag direkt per KI-Assistent, WhatsApp oder Telefon.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Fit-Inn Hilfe" },
  icons: { icon: "/favicon.png", apple: "/favicon.png" },
  openGraph: { siteName: "Hilfe-Center Fit-Inn Trier", locale: "de_DE", type: "website" },
  other: { "mobile-web-app-capable": "yes" },
};

// Zoom bleibt erlaubt (WCAG 1.4.4).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#094b5a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${archivo.variable} ${plex.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-surface font-sans text-ink antialiased dark:bg-[#07181d] dark:text-[#e8f1f3]">
        <a href="#main" className="hc-skip">Zum Inhalt springen</a>
        <MotionProvider>
          <Header />
          <main id="main" className="flex-grow"><ViewTransition>{children}</ViewTransition></main>
          <Footer />
          <CookieBanner />
        </MotionProvider>
        <PageTracker />
        {/* jexitychat Live-Chat-Widget – lazy, blockiert nie die Interaktion */}
        <Script
          id="jexitychat-widget"
          src="https://cdn.jexitychat.de/widget/latest/widget.js"
          data-org-slug="fit-inn-trier"
          data-proj-slug="fit-inn-trier-web"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
