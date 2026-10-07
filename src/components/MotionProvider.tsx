"use client";

import { MotionConfig } from "motion/react";

/**
 * Makes all framer-motion animations respect the user's
 * "prefers-reduced-motion" OS setting. With `reducedMotion="user"`, transform/
 * layout animations are reduced to opacity-only (or skipped) for those users.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
