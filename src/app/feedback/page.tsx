"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { FeedbackSurveyForm } from "@/components/feedbackReferral/FeedbackSurveyForm";
import { cn } from "@/lib/utils";

type Status =
  | { kind: "loading" }
  | { kind: "forbidden" }
  | { kind: "ready"; completed: boolean; code: string | null; shareUrl: string | null }
  | { kind: "done"; code: string; shareUrl: string };

export default function FeedbackPage() {
  const session = useSupabaseSession();
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

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
    setStatus({
      kind: "ready",
      completed: Boolean(data.completed),
      code: data.code ?? null,
      shareUrl: data.shareUrl ?? null,
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

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (status.kind === "ready" && !status.completed) {
    return (
      <FeedbackSurveyForm
        onComplete={(result) =>
          setStatus({
            kind: "done",
            code: result.code,
            shareUrl: result.shareUrl,
          })
        }
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

        {(status.kind === "done" ||
          (status.kind === "ready" && status.completed && status.code)) && (
          <CodeCard
            code={status.kind === "done" ? status.code : status.code!}
            shareUrl={
              status.kind === "done" ? status.shareUrl : status.shareUrl!
            }
            copied={copied}
            onCopy={copy}
          />
        )}
      </Container>
    </div>
  );
}

function CodeCard({
  code,
  shareUrl,
  copied,
  onCopy,
}: {
  code: string;
  shareUrl: string;
  copied: boolean;
  onCopy: (value: string) => void;
}) {
  return (
    <div className="rounded-[1.5rem] bg-surface-elevated p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight text-text">
        Your friend code
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        One friend can use this for 50% off their first payment. It only works
        once, and not on your own account.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <p className="rounded-xl bg-surface-mid px-4 py-3 font-mono text-lg font-bold tracking-wide text-text">
          {code}
        </p>
        <button
          type="button"
          onClick={() => onCopy(code)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl bg-[#4C8BF5] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3B7AE0]",
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <p className="mt-5 text-sm text-text-muted">Share this link:</p>
      <button
        type="button"
        onClick={() => onCopy(shareUrl)}
        className="mt-2 block w-full truncate rounded-xl bg-surface-mid px-4 py-3 text-left text-sm text-text"
      >
        {shareUrl}
      </button>
      <Link
        href="/pricing"
        className="mt-6 inline-flex text-sm font-medium text-[#4C8BF5]"
      >
        Open pricing
      </Link>
    </div>
  );
}
