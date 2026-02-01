"use client";

import { motion } from 'framer-motion';

interface FloatingOrbsProps {
  count?: number;
  className?: string;
  colors?: string[];
}

export default function FloatingOrbs({
  count = 5,
  className = '',
  colors = ['#0a4958', '#cfe5ea', '#ffb54f'],
}: FloatingOrbsProps) {
  const orbs = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 60 + 20,
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: colors[i % colors.length],
    duration: Math.random() * 10 + 15,
    delay: Math.random() * 5,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute rounded-full blur-2xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            backgroundColor: orb.color,
            opacity: 0.2,
          }}
          animate={{
            x: [0, 30, -30, 0],
            y: [0, -30, 30, 0],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: orb.delay,
          }}
        />
      ))}
    </div>
  );
}
