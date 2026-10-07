"use client";

import { useRef, useState, ReactNode } from 'react';
import { motion } from 'motion/react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  delay?: number;
  onClick?: () => void;
  isSelected?: boolean;
}

export default function GlowCard({
  children,
  className = '',
  glowColor = 'rgba(10, 73, 88, 0.4)',
  delay = 0,
  onClick,
  isSelected = false,
}: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      ref={cardRef}
      className={`relative group cursor-pointer ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Glow Effect */}
      <motion.div
        className="absolute -inset-px rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(400px circle at ${mousePosition.x}px ${mousePosition.y}px, ${glowColor}, transparent 40%)`,
        }}
      />

      {/* Shine Effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full"
          animate={{
            x: isHovered ? ['0%', '200%'] : '-100%',
          }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut',
          }}
        />
      </motion.div>

      {/* Card Content */}
      <div
        className={`relative rounded-2xl border transition-all duration-300 ${
          isSelected
            ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20'
            : 'bg-white dark:bg-[#1C1C1E] border-[#E8E8ED] dark:border-[#38383A] hover:border-brand/30 dark:hover:border-brand-light/30 hover:shadow-xl dark:hover:shadow-dark-card-hover'
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}
