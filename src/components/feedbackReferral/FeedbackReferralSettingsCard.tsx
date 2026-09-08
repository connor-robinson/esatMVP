"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = {
  enabled: boolean;
  completed: boolean;
  code: string | null;
};

export function FeedbackReferralSettingsCard() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/feedback-referral/status")
      .then(async (res) => {
        if (res.status === 403) return null;
        if (!res.ok) return null;
        return (await res.json()) as Status;
      })
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status?.enabled) return null;

  return (
    <div className="mt-8 rounded-organic-xl bg-surface-mid/60 px-5 py-5">
      <h3 className="text-sm font-semibold text-text">
        Feedback for a friend code
      </h3>
      <p className="mt-2 text-sm text-text-muted">
        {status.completed
          ? `Your one-friend 50% code is ${status.code}.`
          : "Two minutes of specific feedback unlocks a 50% off code for one friend."}
      </p>
      <Link
        href="/feedback"
        className="mt-4 inline-flex text-sm font-medium text-primary"
      >
        {status.completed ? "View your code" : "Give feedback"}
      </Link>
    </div>
  );
}
