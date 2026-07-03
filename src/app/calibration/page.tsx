"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { CALIBRATION_TOTAL_QUESTIONS } from "@/lib/calibration/constants";
import { trackHomepageEvent } from "@/lib/homepage/analytics";

const GUEST_SESSION_KEY = "nocalc:calibrationGuest";

export default function CalibrationPage() {
  const router = useRouter();
  const session = useSupabaseSession();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStarting(true);
    setError(null);

    void trackHomepageEvent("calibration_cta_clicked", {
      destination: "/calibration/session",
    });

    if (!session?.user) {
      try {
        sessionStorage.setItem(
          GUEST_SESSION_KEY,
          JSON.stringify({ startedAt: Date.now(), completed: 0 }),
        );
      } catch {
        /* ignore */
      }
      router.push("/calibration/session");
      return;
    }

    try {
      const res = await fetch("/api/calibration/status", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start calibration");
        setStarting(false);
        return;
      }
      router.push("/calibration/session");
    } catch {
      setError("Could not start calibration. Try again.");
      setStarting(false);
    }
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Free diagnostic
          </p>
          <h1 className="mt-2 text-3xl font-bold text-text">ESAT skill calibration</h1>
          <p className="mt-3 text-text-muted">
            A {CALIBRATION_TOTAL_QUESTIONS}-question assessment across key no-calculator
            skills. You will receive a profile covering weak areas, speed gaps, accuracy
            issues, and recommended practice.
          </p>
        </div>

        <Card variant="elevated" className="p-6">
          <h2 className="font-semibold text-text">What you receive</h2>
          <ul className="mt-4 space-y-2 text-sm text-text-muted">
            <li>• Strongest and weakest skill areas</li>
            <li>• Speed vs accuracy profile</li>
            <li>• Recommended practice session</li>
            <li>• Link to full results anytime</li>
          </ul>
          {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={starting}
              onClick={() => void handleStart()}
            >
              {starting ? "Starting…" : "Start calibration"}
            </Button>
            {!session?.user ? (
              <Link
                href="/login?redirectTo=/calibration"
                className="inline-flex items-center rounded-organic-md px-5 py-3 text-sm font-medium text-text-muted hover:text-text"
              >
                Sign in to save results
              </Link>
            ) : null}
          </div>
        </Card>

        <p className="text-center text-sm text-text-muted">
          <Link href="/" className="font-semibold text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </Container>
  );
}
