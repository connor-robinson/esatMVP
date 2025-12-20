/**
 * Carousel navigation for quick access
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const PAGES = [
  {
    name: "Drill",
    description: "Practice Sessions",
    href: "/skills/drill",
  },
  {
    name: "Papers",
    description: "Exam Practice",
    href: "/papers/plan",
  },
];

export function QuickNavCarousel() {
  const [centerIndex, setCenterIndex] = useState(0);
  const router = useRouter();

  const handlePrevious = () => {
    setCenterIndex((prev) => (prev === 0 ? PAGES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCenterIndex((prev) => (prev === PAGES.length - 1 ? 0 : prev + 1));
  };

  const handleCenterClick = () => {
    router.push(PAGES[centerIndex].href);
  };

  React.useEffect(() => {
    PAGES.forEach((page) => {
      router.prefetch(page.href);
    });
  }, [router]);

  const getLeftIndex = () => (centerIndex === 0 ? PAGES.length - 1 : centerIndex - 1);
  const getRightIndex = () => (centerIndex === PAGES.length - 1 ? 0 : centerIndex + 1);

  const centerPage = PAGES[centerIndex];
  const leftPage = PAGES[getLeftIndex()];
  const rightPage = PAGES[getRightIndex()];

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <button
          onClick={handlePrevious}
          className="inline-flex items-center justify-center w-8 h-8 rounded-organic-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white/80 scale-95 opacity-80 hover:opacity-100 transition-all hover:bg-white/[0.07] active:scale-90 relative group"
          aria-label="Previous page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => router.push(leftPage.href)}
          className="inline-flex items-center justify-center w-32 px-4 py-2 rounded-organic-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white/80 opacity-60 hover:opacity-100 hover:scale-[1.05] transition-all duration-300 active:scale-95 cursor-pointer relative group"
        >
          <div className="text-center leading-tight">
            <div className="text-sm font-semibold text-white/95 truncate">{leftPage.name}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide truncate">
              {leftPage.description}
            </div>
          </div>
        </button>

        <button
          onClick={handleCenterClick}
          className="inline-flex items-center justify-center w-44 px-6 py-3 rounded-3xl bg-primary/10 border border-primary/30 backdrop-blur-sm hover:bg-primary/15 hover:scale-[1.15] transition-all duration-300 active:scale-95 cursor-pointer relative group"
        >
          <div
            className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: "rgba(133, 188, 130, 0.05)",
              transform: "scale(1.2)",
              transformOrigin: "center",
              zIndex: -9999,
            }}
          />
          <div className="text-center leading-tight flex flex-col items-center justify-center">
            <div className="text-xl font-extrabold text-white">{centerPage.name}</div>
            <div className="text-[9px] text-primary/70 uppercase tracking-wide whitespace-nowrap">
              {centerPage.description}
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(rightPage.href)}
          className="inline-flex items-center justify-center w-32 px-4 py-2 rounded-organic-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white/80 opacity-60 hover:opacity-100 hover:scale-[1.05] transition-all duration-300 active:scale-95 cursor-pointer relative group"
        >
          <div
            className="absolute inset-0 rounded-organic-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              transform: "scale(1.2)",
              transformOrigin: "center",
              zIndex: -9999,
            }}
          />
          <div className="text-center leading-tight">
            <div className="text-sm font-semibold text-white/95 truncate">{rightPage.name}</div>
            <div className="text-[9px] text-white/40 uppercase tracking-wide truncate">
              {rightPage.description}
            </div>
          </div>
        </button>

        <button
          onClick={handleNext}
          className="inline-flex items-center justify-center w-8 h-8 rounded-organic-lg bg-white/5 border border-white/10 backdrop-blur-sm text-white/80 scale-95 opacity-80 hover:opacity-100 transition-all hover:bg-white/[0.07] active:scale-90 relative group"
          aria-label="Next page"
        >
          <div
            className="absolute inset-0 rounded-organic-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              transform: "scale(1.1)",
              transformOrigin: "center",
              zIndex: -9999,
            }}
          />
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}



