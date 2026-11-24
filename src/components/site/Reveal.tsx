import type { CSSProperties, ReactNode } from "react";

/**
 * Subtle fade-up. Pure CSS: content is always rendered visible (no JS needed),
 * browsers with scroll-driven animations reveal it on scroll, others play it once
 * on load. Disabled for prefers-reduced-motion (see globals.css).
 */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`reveal ${className}`} style={delay ? ({ "--reveal-delay": `${delay}s` } as CSSProperties) : undefined}>
      {children}
    </div>
  );
}
