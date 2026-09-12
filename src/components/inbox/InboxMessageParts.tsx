"use client";

import { BrandMarkImage } from "@/components/brand/BrandMarkImage";
import type { InboxThreadReply } from "@/lib/inbox";
import { cn } from "@/lib/utils";

export function formatInboxWhen(iso: string, withTime = false): string {
  const d = new Date(iso);
  if (withTime) {
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

/** Compact ESAT Camp mark used beside message titles. */
export function InboxCampIcon({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md bg-surface-mid",
        className ?? "h-7 w-7",
      )}
    >
      <BrandMarkImage
        className={cn("w-auto", markClassName ?? "h-3.5")}
        alt="ESAT Camp"
      />
    </span>
  );
}

/** Meta line under message content: who + when. */
export function InboxFromMeta({
  from,
  when,
  className,
}: {
  from: string;
  when: string;
  className?: string;
}) {
  return (
    <p className={cn("text-[10px] leading-none text-text-subtle", className)}>
      {from}
      <span className="mx-1 opacity-50">·</span>
      {when}
    </p>
  );
}

/**
 * Thread bubbles: user replies look like WhatsApp "sent" (green, trailing).
 * ESAT Camp follow-ups stay neutral on the leading side.
 */
export function InboxThreadBubbles({
  replies,
  dense = false,
}: {
  replies: InboxThreadReply[];
  dense?: boolean;
}) {
  if (replies.length === 0) return null;

  return (
    <div className={cn("space-y-1.5", dense ? "mt-2" : "mt-4 space-y-2")}>
      {replies.map((r) => {
        const sent = r.direction === "inbound";
        return (
          <div
            key={r.id}
            className={cn("flex", sent ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-lg px-2.5 py-1.5",
                sent
                  ? "rounded-br-sm bg-emerald-100 text-emerald-950 dark:bg-emerald-900/55 dark:text-emerald-50"
                  : "rounded-bl-sm bg-surface-mid text-text",
                dense ? "text-[11px]" : "text-sm",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed">
                {dense && r.body.length > 200
                  ? `${r.body.slice(0, 200)}…`
                  : r.body}
              </p>
              <p
                className={cn(
                  "mt-1 text-right text-[9px] leading-none",
                  sent
                    ? "text-emerald-800/70 dark:text-emerald-100/55"
                    : "text-text-subtle",
                )}
              >
                {sent ? "Sent" : "ESAT Camp"}
                {" · "}
                {formatInboxWhen(r.created_at, true)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
