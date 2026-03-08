import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
  themeColor: "#0a4958",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FIT INN Admin",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
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

        {/* respond.io Live Chat Widget */}
        <script
          id="respondio__widget"
          src="https://cdn.respond.io/webchat/widget/widget.js?cId=5109ea42b3bc2f831ad35ad0db15280"
          async
        />
      </body>
    </html>
  );
}
