"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TOP_PX = 48;
const DIRECTION_DELTA_PX = 6;

function readScrollY(): number {
  if (typeof window === "undefined") return 0;
  return (
    window.scrollY ||
    window.pageYOffset ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function isHomepagePath(pathname: string | null): boolean {
  return pathname === "/" || pathname === "";
}

/**
 * Homepage-only auto-hide chrome:
 * - Hidden on initial load / while scrolling down
 * - Revealed when the user scrolls up (including upward scroll at the top)
 * Other routes always report visible.
 */
export function useHomepageAutoHideNav(options?: {
  /** Keep visible while a menu/modal owned by the nav is open. */
  forceVisible?: boolean;
}) {
  const pathname = usePathname();
  const isHomepage = isHomepagePath(pathname);
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const forceVisible = options?.forceVisible ?? false;

  useEffect(() => {
    if (!isHomepage) {
      setVisible(true);
      return;
    }

    setVisible(false);
    lastScrollY.current = readScrollY();

    const updateFromScroll = () => {
      const y = readScrollY();
      const delta = y - lastScrollY.current;

      if (delta < -DIRECTION_DELTA_PX) {
        setVisible(true);
      } else if (delta > DIRECTION_DELTA_PX) {
        setVisible(false);
      }

      lastScrollY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(updateFromScroll);
    };

    // At the top, scrollY cannot decrease further. Treat upward wheel/touch
    // as an explicit "scroll up" so the nav can still drop in.
    const onWheel = (event: WheelEvent) => {
      if (readScrollY() <= TOP_PX && event.deltaY < 0) {
        setVisible(true);
      }
    };

    let touchStartY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? 0;
      if (readScrollY() <= TOP_PX && y - touchStartY > 12) {
        setVisible(true);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [isHomepage]);

  return {
    isHomepage,
    navVisible: !isHomepage || forceVisible || visible,
  };
}
