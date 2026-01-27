import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import CookieBanner from "@/components/CookieBanner";

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
    <html lang="de">
      <body className="antialiased min-h-screen flex flex-col bg-apple-gray-50">
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
      </body>
    </html>
  );
}
