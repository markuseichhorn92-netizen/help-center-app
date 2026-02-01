"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LikeDislikeAnimationProps {
  onLike?: () => void;
  onDislike?: () => void;
  initialLiked?: boolean | null;
  className?: string;
}

export default function LikeDislikeAnimation({
  onLike,
  onDislike,
  initialLiked = null,
  className = '',
}: LikeDislikeAnimationProps) {
  const [liked, setLiked] = useState<boolean | null>(initialLiked);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; type: 'like' | 'dislike' }[]>([]);

  const createParticles = (type: 'like' | 'dislike') => {
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
      type,
    }));
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 1000);
  };

  const handleLike = () => {
    const newLiked = liked === true ? null : true;
    setLiked(newLiked);
    if (newLiked === true) {
      createParticles('like');
      onLike?.();
    }
  };

  const handleDislike = () => {
    const newLiked = liked === false ? null : false;
    setLiked(newLiked);
    if (newLiked === false) {
      createParticles('dislike');
      onDislike?.();
    }
  };

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Like Button */}
      <motion.button
        onClick={handleLike}
        className={`relative p-3 rounded-full transition-colors ${
          liked === true
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : 'bg-apple-gray-100 dark:bg-dark-surface-elevated text-apple-gray-500 dark:text-apple-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.svg
          className="w-6 h-6"
          fill={liked === true ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={liked === true ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
          />
        </motion.svg>

        {/* Particles */}
        <AnimatePresence>
          {particles
            .filter((p) => p.type === 'like')
            .map((particle) => (
              <motion.span
                key={particle.id}
                className="absolute w-2 h-2 bg-green-500 rounded-full pointer-events-none"
                style={{ left: '50%', top: '50%' }}
                initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: particle.x,
                  y: particle.y,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
      </motion.button>

      {/* Dislike Button */}
      <motion.button
        onClick={handleDislike}
        className={`relative p-3 rounded-full transition-colors ${
          liked === false
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            : 'bg-apple-gray-100 dark:bg-dark-surface-elevated text-apple-gray-500 dark:text-apple-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <motion.svg
          className="w-6 h-6"
          fill={liked === false ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          animate={liked === false ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
          />
        </motion.svg>

        {/* Particles */}
        <AnimatePresence>
          {particles
            .filter((p) => p.type === 'dislike')
            .map((particle) => (
              <motion.span
                key={particle.id}
                className="absolute w-2 h-2 bg-red-500 rounded-full pointer-events-none"
                style={{ left: '50%', top: '50%' }}
                initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: particle.x,
                  y: particle.y,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
