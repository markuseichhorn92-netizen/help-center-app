'use client';

import { motion, useReducedMotion } from 'motion/react';

export default function HeroTitle() {
  const reduce = useReducedMotion();
  const words = ['Wie', 'können', 'wir', 'dir', 'helfen?'];
  return (
    <div>
      <h1 className="text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl" aria-label={words.join(' ')}>
        {words.map((w, i) => (
          <motion.span
            key={w + i}
            aria-hidden
            className="mr-[.25em] inline-block"
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {w}
          </motion.span>
        ))}
      </h1>
      <motion.p
        className="mt-3 text-base text-[#cfe5ea] sm:text-lg"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.5 }}
      >
        Frag einfach – die Antwort ist meist nur einen Klick entfernt.
      </motion.p>
    </div>
  );
}
