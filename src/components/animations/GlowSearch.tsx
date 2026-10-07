"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface GlowSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
}

export default function GlowSearch({ placeholder = 'Suche...', onSearch, className = '' }: GlowSearchProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      {/* Glow Effect */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="absolute -inset-1 rounded-2xl opacity-75 blur-xl pointer-events-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(10, 73, 88, 0.4), transparent 40%)`,
            }}
          />
        )}
      </AnimatePresence>

      {/* Search Container */}
      <motion.form
        onSubmit={handleSubmit}
        className={`relative flex items-center bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-lg dark:shadow-dark-card transition-shadow duration-300 ${
          isFocused ? 'shadow-xl ring-2 ring-brand/20 dark:ring-brand-light/30' : ''
        }`}
        animate={{
          scale: isFocused ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Search Icon */}
        <motion.div
          className="pl-5 text-apple-gray-400"
          animate={{ scale: isFocused ? 1.1 : 1 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </motion.div>

        {/* Input */}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 py-4 px-4 text-lg bg-transparent border-none outline-none text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#98989D]"
        />

        {/* Clear Button */}
        <AnimatePresence>
          {query && (
            <motion.button
              type="button"
              onClick={() => {
                setQuery('');
                onSearch('');
              }}
              className="p-2 mr-2 text-apple-gray-400 hover:text-apple-gray-600 dark:hover:text-dark-text transition-colors"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Search Button */}
        <motion.button
          type="submit"
          className="hidden sm:flex items-center gap-2 px-6 py-3 mr-2 bg-brand text-white rounded-xl font-medium"
          whileHover={{ scale: 1.05, backgroundColor: '#073440' }}
          whileTap={{ scale: 0.95 }}
        >
          <span>Suchen</span>
        </motion.button>
      </motion.form>

      {/* Keyboard Hint */}
      <motion.div
        className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-xs text-apple-gray-400 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFocused ? 0 : 0.7 }}
      >
        <kbd className="px-2 py-1 bg-apple-gray-100 dark:bg-dark-surface-elevated rounded text-[10px] font-mono">⌘</kbd>
        <kbd className="px-2 py-1 bg-apple-gray-100 dark:bg-dark-surface-elevated rounded text-[10px] font-mono">K</kbd>
      </motion.div>
    </motion.div>
  );
}
