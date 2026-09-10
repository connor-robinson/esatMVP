"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useOptionalSupport } from "@/components/support/SupportProvider";
import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/ga/trackEvent";
import {
  SUPPORT_PUBLIC_EMAIL,
  SUPPORT_RESPONSE_COPY,
} from "@/lib/support/constants";
import { cn } from "@/lib/utils";

export default function HelpContactPage() {
  const session = useSupabaseSession();
  const support = useOptionalSupport();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const bugTopicOpened = useRef(false);

  const loginHref = useMemo(
    () => `/login?redirectTo=${encodeURIComponent(pathname || "/help")}`,
    [pathname],
  );

  const topicIsBug = searchParams.get("topic") === "bug";

  useEffect(() => {
    if (!session?.user || !support || !topicIsBug || bugTopicOpened.current) {
      return;
    }
    bugTopicOpened.current = true;
    trackEvent("support_opened", { placement: "help_topic_bug" });
    support.openSupport({
      category: "technical_problem",
      subject: "Past paper player bug",
    });
  }, [session?.user, support, topicIsBug]);

  return (
    <Container size="sm" className="py-14 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          Support
        </p>
        <h1 className="mt-3 text-3xl font-display font-bold tracking-tight text-text">
          Help &amp; contact
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Asynchronous customer support for ESAT Camp. {SUPPORT_RESPONSE_COPY}
        </p>

        <div className="mt-8 space-y-3 rounded-organic-xl bg-surface-elevated px-5 py-5">
          <p className="text-sm font-semibold text-text">Email us directly</p>
          <a
            href={`mailto:${SUPPORT_PUBLIC_EMAIL}`}
            className="inline-block text-base font-medium text-text underline-offset-2 hover:underline"
          >
            {SUPPORT_PUBLIC_EMAIL}
          </a>
          <p className="text-sm text-text-muted">{SUPPORT_RESPONSE_COPY}</p>
        </div>

        {!session?.user ? (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-text-muted">
              Sign in to send a message through the in-app support form.
            </p>
            <Link
              href={loginHref}
              className={cn(
                "inline-flex items-center justify-center rounded-organic-md bg-primary px-5 py-3",
                "text-sm font-semibold text-background transition-opacity hover:opacity-90",
              )}
            >
              Sign in
            </Link>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            <p className="text-sm text-text-muted">
              Prefer the form? Open it from here or use the Help button on any
              signed-in page.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                trackEvent("support_opened", { placement: "help_center" });
                support?.openSupport(
                  topicIsBug
                    ? {
                        category: "technical_problem",
                        subject: "Past paper player bug",
                      }
                    : undefined,
                );
              }}
            >
              Open support form
            </Button>
          </div>
        )}
      </div>
    </Container>
  );
}
