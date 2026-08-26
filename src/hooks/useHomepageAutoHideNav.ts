"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const TOP_HIDE_PX = 24;
const DIRECTION_DELTA_PX = 8;

/**
 * Homepage-only auto-hide chrome: hidden at the top / while scrolling down,
 * revealed when the user scrolls up. Other routes always report visible.
 */
export function useHomepageAutoHideNav(options?: {
  /** Keep visible while a menu/modal owned by the nav is open. */
  forceVisible?: boolean;
}) {
  const pathname = usePathname();
  const isHomepage = pathname === "/";
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const forceVisible = options?.forceVisible ?? false;

  useEffect(() => {
    if (!isHomepage) {
      setVisible(true);
      return;
    }

    setVisible(false);
    lastScrollY.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      if (y <= TOP_HIDE_PX) {
        setVisible(false);
      } else if (delta < -DIRECTION_DELTA_PX) {
        setVisible(true);
      } else if (delta > DIRECTION_DELTA_PX) {
        setVisible(false);
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomepage]);

  return {
    isHomepage,
    navVisible: !isHomepage || forceVisible || visible,
  };
}
