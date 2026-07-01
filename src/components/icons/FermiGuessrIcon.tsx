/**
 * FermiGuessr mark — question mark fused with a lightbulb (silhouette).
 * Uses currentColor; no fixed brand fill.
 */

import type { LucideProps } from 'lucide-react';

export function FermiGuessrIcon({ className, ...props }: LucideProps) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='currentColor'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden
      className={className}
      {...props}
    >
      {/* ? hook + stem flowing into bulb base */}
      <path d='M12 2.25C8.04 2.25 4.75 5.18 4.75 8.85c0 2.42 1.28 4.22 3.08 5.28.88.54 1.37 1.42 1.42 2.38l.03.49h2.44l.03-.49c.05-.96.54-1.84 1.42-2.38 1.8-1.06 3.08-2.86 3.08-5.28 0-3.67-3.29-6.6-7.25-6.6zm0 1.85c2.94 0 5.4 2.06 5.4 4.75 0 1.58-.86 2.92-2.18 3.68-.96.58-1.56 1.48-1.66 2.58l-.03.22h-3.06l-.03-.22c-.1-1.1-.7-2-1.66-2.58-1.32-.76-2.18-2.1-2.18-3.68 0-2.69 2.46-4.75 5.4-4.75z' />
      <path d='M8.85 15.35c-.72 1.48-.48 2.92.98 4.18.48.5.82 1.05.82 1.72v.75h3.7v-.75c0-.67.34-1.22.82-1.72 1.46-1.26 1.7-2.7.98-4.18H8.85zm3.15 2.9a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9z' />
      <path
        d='M10.1 18.35c.5.5 1 .85 1.9.85'
        fill='none'
        stroke='currentColor'
        strokeWidth='1.2'
        strokeLinecap='round'
        opacity='0.4'
      />
    </svg>
  );
}
