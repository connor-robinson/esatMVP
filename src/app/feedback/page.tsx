"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FeedbackSurveyForm } from "@/components/feedbackReferral/FeedbackSurveyForm";
import { FeedbackReferralCodeScreen } from "@/components/feedbackReferral/FeedbackReferralCodeScreen";
import { markFeedbackReferralAsked } from "@/lib/feedbackReferral/markAsked";

type Status =
  | { kind: "loading" }
  | { kind: "forbidden" }
  | {
      kind: "ready";
      completed: boolean;
      code: string | null;
      shareUrl: string | null;
      redeemed: boolean;
    }
  | { kind: "done"; code: string; shareUrl: string; redeemed: boolean };

export default function FeedbackPage() {
  const session = useSupabaseSession();
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  const loadStatus = useCallback(async () => {
    if (!session?.user) return;
    const res = await fetch("/api/feedback-referral/status");
    if (res.status === 403) {
      setStatus({ kind: "forbidden" });
      return;
    }
    if (!res.ok) {
      setStatus({ kind: "forbidden" });
      return;
    }
    const data = await res.json();
    if (!data.completed) {
      markFeedbackReferralAsked();
    }
    setStatus({
      kind: "ready",
      completed: Boolean(data.completed),
      code: data.code ?? null,
      shareUrl: data.shareUrl ?? null,
      redeemed: Boolean(data.redeemed),
    });
  }, [session?.user]);

  useEffect(() => {
    if (session === undefined) return;
    if (!session?.user) {
      router.replace("/login?redirectTo=%2Ffeedback");
      return;
    }
    void loadStatus();
  }, [session, router, loadStatus]);

  if (status.kind === "ready" && !status.completed) {
    return (
      <FeedbackSurveyForm
        onComplete={(result) =>
          setStatus({
            kind: "done",
            code: result.code,
            shareUrl: result.shareUrl,
            redeemed: false,
          })
        }
      />
    );
  }

  if (
    status.kind === "done" ||
    (status.kind === "ready" && status.completed && status.code && status.shareUrl)
  ) {
    return (
      <FeedbackReferralCodeScreen
        code={status.kind === "done" ? status.code : status.code!}
        shareUrl={
          status.kind === "done" ? status.shareUrl : status.shareUrl!
        }
        redeemed={status.redeemed}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-58px)] bg-background py-12">
      <Container size="md">
        {status.kind === "loading" ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : null}

        {status.kind === "forbidden" ? (
          <div className="rounded-[1.5rem] bg-surface-elevated p-8">
            <h1 className="text-2xl font-bold text-text">Not open yet</h1>
            <p className="mt-3 text-sm text-text-muted">
              This feedback reward is in preview. It is not live for everyone.
            </p>
            <Link
              href="/profile"
              className="mt-6 inline-flex text-sm font-medium text-[#4C8BF5]"
            >
              Back to settings
            </Link>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
