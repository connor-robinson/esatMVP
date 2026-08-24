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
}: {
  content: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [StemContent, setStemContent] = useState<
    null | typeof import("@/components/shared/StemContent").StemContent
  >(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
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
          {content.replace(/\$/g, "")}
        </div>
      )}
    </div>
  );
}
