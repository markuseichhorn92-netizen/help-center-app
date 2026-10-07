'use client';

import { useEffect } from 'react';
import {  useReducedMotion, useScroll, useSpring } from 'motion/react';
import * as m from 'motion/react-m';

// Lesefortschritt (dünne Linie oben) + anonymer Aufruf-Zähler (max. 1×/30 Min je Artikel).
export default function ArticleEffects({ articleId }: { articleId: string }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });

  useEffect(() => {
    const key = `viewed_${articleId}`;
    const last = Number(localStorage.getItem(key) || 0);
    if (Date.now() - last < 30 * 60_000) return;
    localStorage.setItem(key, String(Date.now()));
    fetch(`/api/articles/${articleId}/view`, { method: 'POST' }).catch(() => {});
  }, [articleId]);

  return (
    <m.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-gold"
      style={{ scaleX: reduce ? scrollYProgress : scaleX }}
    />
  );
}
