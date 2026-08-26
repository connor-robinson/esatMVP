"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TOP_HIDE_PX = 48;
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
 * Homepage-only auto-hide chrome: hidden near the top / while scrolling down,
 * revealed when the user scrolls up. Other routes always report visible.
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

    const update = () => {
      const y = readScrollY();
      const delta = y - lastScrollY.current;

      if (y <= TOP_HIDE_PX) {
        setVisible(false);
      } else if (delta < -DIRECTION_DELTA_PX) {
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
      window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [isHomepage]);

  return {
    isHomepage,
    navVisible: !isHomepage || forceVisible || visible,
  };
}
