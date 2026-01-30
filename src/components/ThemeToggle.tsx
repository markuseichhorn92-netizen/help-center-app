'use client';

import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check initial theme
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(stored === 'dark' || (!stored && prefersDark));
  }, []);

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    localStorage.setItem('theme', newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-[60px] h-8" />; // Placeholder with same dimensions
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-8 w-[60px] items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
      style={{
        background: isDark 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
          : 'linear-gradient(135deg, #87CEEB 0%, #E0F6FF 100%)',
        boxShadow: isDark
          ? 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)'
          : 'inset 0 2px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.1)',
      }}
      aria-label={isDark ? 'Zu hellem Modus wechseln' : 'Zu dunklem Modus wechseln'}
      title={isDark ? 'Heller Modus' : 'Dunkler Modus'}
    >
      {/* Stars (visible in dark mode) */}
      <span 
        className="absolute left-2 top-1.5 transition-opacity duration-300"
        style={{ opacity: isDark ? 1 : 0 }}
      >
        <span className="absolute h-1 w-1 rounded-full bg-white/80" style={{ top: 2, left: 0 }} />
        <span className="absolute h-0.5 w-0.5 rounded-full bg-white/60" style={{ top: 8, left: 6 }} />
        <span className="absolute h-1 w-1 rounded-full bg-white/70" style={{ top: 12, left: 2 }} />
      </span>

      {/* Sun rays (visible in light mode) */}
      <span 
        className="absolute right-2.5 top-2 transition-opacity duration-300"
        style={{ opacity: isDark ? 0 : 1 }}
      >
        <span className="absolute h-1 w-1 rounded-full bg-yellow-400/60" style={{ top: -4, left: 2 }} />
        <span className="absolute h-0.5 w-0.5 rounded-full bg-yellow-300/50" style={{ top: 6, left: -2 }} />
      </span>

      {/* Toggle Circle (Sun/Moon) */}
      <span
        className="absolute flex items-center justify-center rounded-full shadow-lg transition-all duration-500 ease-[cubic-bezier(0.68,-0.6,0.32,1.6)]"
        style={{
          width: 24,
          height: 24,
          left: isDark ? 32 : 4,
          background: isDark
            ? 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)'
            : 'linear-gradient(135deg, #FFD93D 0%, #FF9F1C 100%)',
          boxShadow: isDark
            ? '0 2px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(0,0,0,0.1)'
            : '0 2px 8px rgba(255,159,28,0.4), inset 0 -2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {/* Moon craters (visible in dark mode) */}
        {isDark && (
          <>
            <span 
              className="absolute rounded-full bg-gray-300/50"
              style={{ width: 6, height: 6, top: 4, left: 5 }}
            />
            <span 
              className="absolute rounded-full bg-gray-300/40"
              style={{ width: 4, height: 4, top: 12, left: 10 }}
            />
            <span 
              className="absolute rounded-full bg-gray-300/30"
              style={{ width: 3, height: 3, top: 8, left: 14 }}
            />
          </>
        )}
        
        {/* Sun face glow (visible in light mode) */}
        {!isDark && (
          <span 
            className="absolute inset-1 rounded-full"
            style={{
              background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 60%)',
            }}
          />
        )}
      </span>
    </button>
  );
}
