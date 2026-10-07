"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * - respektiert prefers-reduced-motion (reducedMotion="user")
 * - LazyMotion: schlanke Animations-Features für die öffentlichen Seiten (m-Komponenten),
 *   `motion`-Komponenten im Admin-Bereich funktionieren unverändert weiter.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
