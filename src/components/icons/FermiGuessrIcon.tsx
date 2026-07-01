/**
 * FermiGuessr mark — question mark in front of a lightbulb.
 * Stroke-based to match lucide icons; uses currentColor.
 */

import type { LucideProps } from 'lucide-react';

export function FermiGuessrIcon({
  className,
  strokeWidth = 2,
  ...props
}: LucideProps) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
      xmlns='http://www.w3.org/2000/svg'
      aria-hidden
      className={className}
      {...props}
    >
      {/* Lightbulb — behind, offset right */}
      <path d='M16.25 15.75V17.25' />
      <path d='M15.25 19.75h2' />
      <path d='M16.25 7.25a4.25 4.25 0 0 0-5.75 3.95c0 1.2.55 2.15 1.1 2.8.4.5.65 1.05.65 1.7v1.05' />
      <path d='M16.25 7.25V5.75' />

      {/* Question mark — in front, offset left */}
      <path d='M6.75 8.25a3 3 0 0 1 5.55 1.2c0 2-2.55 2.65-2.55 4.3' />
      <circle cx='9.75' cy='18' r='0.9' fill='currentColor' stroke='none' />
    </svg>
  );
}
