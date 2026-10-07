"use client";

import { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

interface ReadingProgressProps {
  className?: string;
  color?: string;
  height?: number;
}

export default function ReadingProgress({
  className = '',
  color = 'bg-gradient-to-r from-brand via-brand-light to-brand',
  height = 3,
}: ReadingProgressProps) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Background Track */}
      <div
        className="w-full bg-apple-gray-200/50 dark:bg-dark-border/50"
        style={{ height }}
      />
      
      {/* Progress Bar */}
      <motion.div
        className={`absolute top-0 left-0 h-full ${color} origin-left`}
        style={{ scaleX, height }}
      />

      {/* Glow Effect */}
      <motion.div
        className="absolute top-0 right-0 w-20 h-full bg-gradient-to-r from-transparent to-white/50 dark:to-white/20 pointer-events-none"
        style={{
          left: scrollYProgress,
          opacity: useSpring(scrollYProgress, { stiffness: 100, damping: 30 }),
        }}
      />
    </motion.div>
  );
}
