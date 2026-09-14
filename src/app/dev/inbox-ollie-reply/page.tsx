"use client";

import { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import {
  formatInboxWhen,
  InboxCampIcon,
  InboxFromMeta,
} from "@/components/inbox/InboxMessageParts";
import { cn } from "@/lib/utils";

/**
 * Local preview: what Ollie would see when we reply via inbox.
 * Open /dev/inbox-ollie-reply
 *
 * Note: the real inbox only sets subject to "Re: {ticket subject}".
 * It does NOT quote the original ticket body unless we put that in our reply text.
 */

const SUBJECT = "Re: Extra Time setting";

const DRAFT_WITH_CONTEXT = `Hi Ollie,

Thanks for the suggestion about adding a time multiplier for extra time (+25%) / rest breaks on timed exams, and sorry for the slow reply.

We've now wired both of these into timed practice:

Extra time – turn on Extra Time in Profile (Settings) and set your percentage (e.g. +25%). Timed past papers and question-bank sessions will use that longer limit.

Rest breaks – turn on Rest breaks in the same Access arrangements section. You'll get a Pause control during timed sittings (up to 3 per section), the clock stops, and the questions are hidden until you resume, matching pause-the-clock on the real exam.

If anything still feels off after you enable them, reply here and we'll sort it.

Thanks again,
Anson
ESATcamp`;

const DRAFT_WITHOUT_CONTEXT = `Hi Ollie,

Thanks for the suggestion, and sorry for the slow reply.

We've now wired both of these into timed practice:

Extra time – turn on Extra Time in Profile (Settings) and set your percentage (e.g. +25%). Timed past papers and question-bank sessions will use that longer limit.

Rest breaks – turn on Rest breaks in the same Access arrangements section. You'll get a Pause control during timed sittings (up to 3 per section), the clock stops, and the questions are hidden until you resume, matching pause-the-clock on the real exam.

If anything still feels off after you enable them, reply here and we'll sort it.

Thanks again,
Anson
ESATcamp`;

export default function DevInboxOllieReplyPreviewPage() {
  const [includeContext, setIncludeContext] = useState(true);
  const body = includeContext ? DRAFT_WITH_CONTEXT : DRAFT_WITHOUT_CONTEXT;
  const createdAt = new Date().toISOString();

  return (
    <Container size="lg" className="py-10 sm:py-12">
      <div className="mb-6 space-y-3 rounded-organic-xl border border-border-subtle bg-surface-mid/50 px-4 py-4 text-sm text-text-muted">
        <p className="font-medium text-text">
          Dev preview: Ollie&apos;s inbox after our reply
        </p>
        <p>
          Real behaviour: subject becomes{" "}
          <span className="font-mono text-text">{SUBJECT}</span>. His original
          ticket text is <strong className="text-text">not</strong> quoted by
          the inbox UI unless we mention it in the body.
        </p>
        <label className="flex items-center gap-2 text-text">
          <input
            type="checkbox"
            checked={includeContext}
            onChange={(e) => setIncludeContext(e.target.checked)}
          />
          Include a short reference to his request in the body (recommended)
        </label>
        <p>
          <Link href="/inbox" className="underline-offset-2 hover:underline">
            Open real /inbox
          </Link>{" "}
          (needs your login; this page is a static mock).
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text">Inbox</h1>
          <p className="mt-1 text-sm text-text-muted">
            Messages from ESAT Camp. Reply here when you need to follow up.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <ul className="space-y-2">
          <li>
            <div className="w-full rounded-organic-xl bg-surface-elevated px-4 py-3 text-left">
              <div className="flex items-start gap-2.5">
                <InboxCampIcon showUnreadDot />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-normal break-words text-sm font-semibold leading-snug text-text">
                    {SUBJECT}
                  </p>
                  <p className="mt-1.5 truncate text-xs leading-snug text-text-muted">
                    {body.replace(/\s+/g, " ").trim()}
                  </p>
                  <InboxFromMeta
                    className="mt-2"
                    from="ESAT Camp · direct"
                    when={formatInboxWhen(createdAt)}
                  />
                </div>
              </div>
            </div>
          </li>
        </ul>

        <article className="rounded-organic-xl bg-surface-elevated px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <InboxCampIcon className="h-8 w-8" markClassName="h-4" />
            <h2 className="min-w-0 flex-1 font-heading text-xl font-semibold leading-snug text-text">
              {SUBJECT}
            </h2>
          </div>
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text">
            {body}
          </div>
          <InboxFromMeta
            className="mt-3"
            from="ESAT Camp · direct"
            when={formatInboxWhen(createdAt, true)}
          />

          <div className="mt-6 border-t border-border-subtle pt-5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                disabled
                className="min-w-0 flex-1 rounded-organic-md border border-border-subtle bg-surface-subtle px-3 py-2 text-sm text-text opacity-70"
                placeholder="Reply to ESAT Camp…"
                aria-label="Reply to ESAT Camp (preview)"
              />
              <button
                type="button"
                disabled
                className={cn(
                  "shrink-0 rounded-organic-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white opacity-50",
                )}
              >
                Reply
              </button>
            </div>
          </div>
        </article>
      </div>
    </Container>
  );
}
