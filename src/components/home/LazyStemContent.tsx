"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders KaTeX-backed StemContent only once near the viewport,
 * so katex CSS/JS are not on the critical homepage path.
 */
export function LazyStemContent({
  content,
  className,
  fallback,
}: {
  content: string;
  className?: string;
  /** Plain-text placeholder until KaTeX loads. */
  fallback?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [StemContent, setStemContent] = useState<
    null | typeof import("@/components/shared/StemContent").StemContent
  >(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const startLoading = () => setShouldLoad(true);

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 200 && rect.bottom > -200) {
      startLoading();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          startLoading();
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(node);

    if (document.readyState === "complete") {
      startLoading();
    } else {
      window.addEventListener("load", startLoading, { once: true });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("load", startLoading);
    };
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    void import("@/components/shared/StemContent").then((mod) => {
      if (!cancelled) setStemContent(() => mod.StemContent);
    });
    return () => {
      cancelled = true;
    };
  }, [shouldLoad]);

  return (
    <div ref={ref} className={cn(className)}>
      {StemContent ? (
        <StemContent content={content} className="text-inherit" />
      ) : (
        <div className="whitespace-pre-wrap text-inherit opacity-90">
          {fallback ?? content.replace(/\$/g, "").replace(/\\/g, "")}
        </div>
      )}
    </div>
  );
}
