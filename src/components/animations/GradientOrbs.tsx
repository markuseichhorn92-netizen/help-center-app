"use client";

import { motion } from 'framer-motion';

interface GradientOrbsProps {
  count?: number;
  className?: string;
}

export default function GradientOrbs({ count = 3, className = '' }: GradientOrbsProps) {
  const orbs = [
    {
      size: 'w-96 h-96',
      color: 'bg-brand/30 dark:bg-brand-light/20',
      position: '-top-48 -left-48',
      animation: {
        x: [0, 100, 50, 0],
        y: [0, 50, 100, 0],
        scale: [1, 1.2, 0.9, 1],
      },
      duration: 20,
    },
    {
      size: 'w-80 h-80',
      color: 'bg-accent/20 dark:bg-accent/10',
      position: '-bottom-40 -right-40',
      animation: {
        x: [0, -80, -40, 0],
        y: [0, -60, 40, 0],
        scale: [1, 0.8, 1.1, 1],
      },
      duration: 25,
    },
    {
      size: 'w-64 h-64',
      color: 'bg-brand-light/40 dark:bg-brand/20',
      position: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      animation: {
        x: [0, 60, -60, 0],
        y: [0, -80, 40, 0],
        scale: [1, 1.1, 0.95, 1],
      },
      duration: 22,
    },
  ].slice(0, count);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb, index) => (
        <motion.div
          key={index}
          className={`absolute ${orb.size} ${orb.color} ${orb.position} rounded-full blur-3xl opacity-60`}
          animate={orb.animation}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
