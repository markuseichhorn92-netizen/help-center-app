"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";

// Compact theme toggle for mobile header
function MiniThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(stored === 'dark' || (!stored && prefersDark));
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  if (!mounted) return <div className="w-10 h-10" />;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 text-apple-gray-500 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light transition-colors"
      aria-label={isDark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
    >
      {isDark ? (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3a1 1 0 011 1v1a1 1 0 11-2 0V4a1 1 0 011-1zm0 15a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm9-6a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5 12a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zm14.07-6.36a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zM7.05 17.66a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zm11.31 1.41a1 1 0 01-1.41 0l-.71-.71a1 1 0 111.41-1.41l.71.71a1 1 0 010 1.41zM7.05 6.34a1 1 0 01-1.41 0l-.71-.71a1 1 0 011.41-1.41l.71.71a1 1 0 010 1.41zM12 8a4 4 0 100 8 4 4 0 000-8z"/>
        </svg>
      ) : (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
      )}
    </button>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Don't show header on admin or chat pages
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/chat")) {
    return null;
  }

  return (
    <header className="glass border-b border-apple-gray-200/50 dark:border-dark-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="https://cdn.sanity.io/images/6qiktmvm/production/e33b949b11d3aa8b60befb3f5f537803a8c48700-2917x486.png"
              alt="FIT INN Logo"
              width={192}
              height={32}
              className="h-8 w-auto transition-transform duration-300 group-hover:scale-105"
              priority
            />
            <span className="text-lg font-semibold text-apple-gray-600 dark:text-dark-text tracking-tight">Hilfe-Center</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href="/portal"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-apple-gray-500 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Meine Tickets
            </Link>
            <Link
              href="https://fit-inn-trier.de"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-apple-gray-500 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light transition-colors duration-200"
            >
              <span>Zur Website</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            
            {/* Dark Mode Toggle */}
            <ThemeToggle />
          </nav>

          {/* Mobile: Theme Toggle + Hamburger */}
          <div className="sm:hidden flex items-center gap-1">
            {/* Mini Theme Toggle */}
            <MiniThemeToggle />
            
            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-apple-gray-500 hover:text-brand transition-colors"
              aria-label="Menü öffnen"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-apple-gray-200/50 dark:border-dark-border py-4 space-y-3 animate-fade-in">
            <Link
              href="/portal"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm font-medium text-apple-gray-500 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light transition-colors duration-200 py-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Meine Tickets</span>
            </Link>
            <Link
              href="https://fit-inn-trier.de"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm font-medium text-apple-gray-500 dark:text-apple-gray-300 hover:text-brand dark:hover:text-brand-light transition-colors duration-200 py-2"
            >
              <span>Zur Website</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
            
            {/* Dark Mode Toggle (Mobile) */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium text-apple-gray-500 dark:text-apple-gray-300">Erscheinungsbild</span>
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
