"use client";

import Image from "next/image";
import { useState } from "react";
import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

/** Raster mark intrinsic size (preserve aspect ratio - do not force square). */
export const BRAND_MARK_WIDTH = 687;
export const BRAND_MARK_HEIGHT = 583;

interface BrandMarkImageProps {
  className?: string;
  alt?: string;
  /** Prefetch in document head; use for navbar / above-the-fold lockups. */
  priority?: boolean;
}

const MARK_BASE_CLASS =
  "block shrink-0 w-auto max-w-none object-contain object-left " +
  // Default white mark - app defaults to dark theme (incl. SSR before theme script runs).
  "brightness-100 invert-0 " +
  // Light theme - dark mark on light backgrounds.
  "[.light_&]:brightness-0 [.light_&]:invert";

/** Minimal teepee silhouette if the hashed asset fails to paint (avoids broken-image icon). */
function BrandMarkFallback({
  className,
  alt,
}: {
  className?: string;
  alt: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${BRAND_MARK_WIDTH} ${BRAND_MARK_HEIGHT}`}
      width={BRAND_MARK_WIDTH}
      height={BRAND_MARK_HEIGHT}
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      focusable="false"
      className={cn(MARK_BASE_CLASS, "fill-current text-white", className)}
    >
      <path d="M343.5 48 L118 535 H236 L343.5 268 L451 535 H569 Z" />
      <path d="M343.5 210 L286 535 H401 Z" opacity="0.55" />
    </svg>
  );
}

/** White teepee on transparent PNG; inverted in light mode. */
export function BrandMarkImage({
  className,
  alt = "",
  priority = false,
}: BrandMarkImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <BrandMarkFallback className={className} alt={alt} />;
  }

  return (
    <Image
      src={logoMark}
      alt={alt}
      width={BRAND_MARK_WIDTH}
      height={BRAND_MARK_HEIGHT}
      priority={priority}
      unoptimized
      draggable={false}
      onError={() => setFailed(true)}
      className={cn(MARK_BASE_CLASS, className)}
    />
  );
}
