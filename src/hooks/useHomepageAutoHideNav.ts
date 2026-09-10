"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TOP_PX = 48;
const DIRECTION_DELTA_PX = 6;
/** At the top of the homepage, require this many upward wheel/touch nudges. */
const TOP_UPSCROLLS_TO_REVEAL = 2;
const TOP_TOUCH_DELTA_PX = 28;

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
 * - At the top, one extra upscroll is required before the nav appears
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
  const topUpScrolls = useRef(0);
  const forceVisible = options?.forceVisible ?? false;

  useEffect(() => {
    if (!isHomepage) {
      setVisible(true);
      return;
    }

    setVisible(false);
    lastScrollY.current = readScrollY();
    topUpScrolls.current = 0;

    const updateFromScroll = () => {
      const y = readScrollY();
      const delta = y - lastScrollY.current;

      if (delta < -DIRECTION_DELTA_PX) {
        // Mid-page scroll up still reveals normally.
        if (y > TOP_PX) {
          setVisible(true);
          topUpScrolls.current = 0;
        }
      } else if (delta > DIRECTION_DELTA_PX) {
        setVisible(false);
        topUpScrolls.current = 0;
      }

      lastScrollY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(updateFromScroll);
    };

    // At the top, scrollY cannot decrease further. Count upward wheel nudges
    // so the first flick does not open the nav; the second one does.
    const onWheel = (event: WheelEvent) => {
      if (readScrollY() > TOP_PX) return;
      if (event.deltaY >= 0) {
        topUpScrolls.current = 0;
        return;
      }
      topUpScrolls.current += 1;
      if (topUpScrolls.current >= TOP_UPSCROLLS_TO_REVEAL) {
        setVisible(true);
      }
    };

    let touchStartY = 0;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (readScrollY() > TOP_PX) return;
      const y = event.touches[0]?.clientY ?? 0;
      const pull = y - touchStartY;
      if (pull > TOP_TOUCH_DELTA_PX) {
        topUpScrolls.current += 1;
        touchStartY = y;
        if (topUpScrolls.current >= TOP_UPSCROLLS_TO_REVEAL) {
          setVisible(true);
        }
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
