import type { ReactNode } from 'react';

// Scroll-Reveal rein per CSS (animation-timeline: view()) – kein JavaScript, Inhalt ist ohne Support
// (und bei prefers-reduced-motion) einfach sofort sichtbar. `delay` wirkt als Stagger-Index.
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }: {
  children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'section';
}) {
  return <Tag className={`hc-reveal ${className}`} style={{ ['--hc-d' as string]: `${Math.round(delay * 100)}%` }}>{children}</Tag>;
}
