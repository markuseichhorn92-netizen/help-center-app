"use client";

import { motion } from 'motion/react';

interface ScrollIndicatorProps {
  className?: string;
}

export default function ScrollIndicator({ className = '' }: ScrollIndicatorProps) {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight - 80,
      behavior: 'smooth',
    });
  };

  return (
    <motion.button
      onClick={scrollToContent}
      className={`flex flex-col items-center gap-2 cursor-pointer ${className}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.6 }}
      whileHover={{ scale: 1.1 }}
    >
      <span className="text-sm font-medium text-[#6E6E73] dark:text-[#A1A1A6]">Mehr entdecken</span>
      
      {/* Mouse Icon */}
      <motion.div
        className="relative w-6 h-10 rounded-full border-2 border-[#86868B] dark:border-[#6E6E73]"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Scroll Wheel */}
        <motion.div
          className="absolute left-1/2 top-2 w-1 h-2 bg-brand dark:bg-[#A8D4DE] rounded-full -translate-x-1/2"
          animate={{ y: [0, 8, 0], opacity: [1, 0, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>

      {/* Chevron */}
      <motion.svg
        className="w-5 h-5 text-[#86868B] dark:text-[#6E6E73]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </motion.svg>
    </motion.button>
  );
}
