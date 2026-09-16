"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/Container";

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t")?.trim() ?? "";
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const unsubscribe = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setError("This unsubscribe link is missing or invalid.");
      return;
    }
    setStatus("working");
    setError(null);
    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setError(
          typeof json.error === "string"
            ? json.error
            : "Could not unsubscribe. Please try again from your profile.",
        );
        return;
      }
      setStatus("ok");
    } catch {
      setStatus("error");
      setError("Could not unsubscribe. Please try again from your profile.");
    }
  }, [token]);

  useEffect(() => {
    if (status === "idle" && token) {
      void unsubscribe();
    } else if (status === "idle" && !token) {
      setStatus("error");
      setError("This unsubscribe link is missing or invalid.");
    }
  }, [status, token, unsubscribe]);

  return (
    <Container size="sm" className="py-16">
      <h1 className="text-2xl font-semibold text-text">Unsubscribe</h1>
      {status === "working" || status === "idle" ? (
        <p className="mt-3 text-sm text-text-muted">
          Turning off product emails…
        </p>
      ) : null}
      {status === "ok" ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-text-muted">
            You are unsubscribed from Tips and Tricks / product emails.
          </p>
          <p className="text-sm text-text-muted">
            You can turn them back on anytime in your{" "}
            <Link href="/profile" className="font-semibold text-text underline-offset-2 hover:underline">
              profile
            </Link>
            .
          </p>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "Something went wrong."}
          </p>
          <Link
            href="/profile"
            className="inline-flex rounded-organic-md bg-secondary/25 px-3 py-2 text-sm font-semibold text-text"
          >
            Manage preferences
          </Link>
        </div>
      ) : null}
    </Container>
  );
}

export default function EmailUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <Container size="sm" className="py-16">
          <p className="text-sm text-text-muted">Loading…</p>
        </Container>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
