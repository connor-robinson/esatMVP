"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox } from "lucide-react";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { cn } from "@/lib/utils";

const NAV_ICON_PX = 20;
const NAV_ICON_STROKE = 2;

type Props = {
  className?: string;
};

/**
 * Navbar inbox icon with unread badge. Polls lightly while signed in.
 */
export function InboxNavButton({ className }: Props) {
  const session = useSupabaseSession();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname === "/inbox" || pathname.startsWith("/inbox/");

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setUnread(0);
      return;
    }
    try {
      const res = await fetch("/api/inbox?limit=50", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { unreadCount?: number };
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : 0);
    } catch {
      /* ignore */
    }
  }, [session?.user]);

  useEffect(() => {
    void refresh();
    if (!session?.user) return;
    const id = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user, refresh, pathname]);

  if (!session?.user) return null;

  const label =
    unread > 0
      ? `Inbox, ${unread} unread`
      : "Inbox";

  return (
    <Link
      href="/inbox"
      className={cn(className, "relative", active && "bg-secondary/15")}
      aria-label={label}
    >
      <Inbox
        aria-hidden
        className={cn(active ? "text-secondary" : "text-text")}
        size={NAV_ICON_PX}
        strokeWidth={NAV_ICON_STROKE}
      />
      {unread > 0 ? (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold leading-none text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
