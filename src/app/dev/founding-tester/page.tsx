"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { useSupabaseSession } from "@/components/auth/SupabaseSessionProvider";
import { useTesterProgrammeOptional } from "@/contexts/TesterProgrammeContext";
import { AccessStatusCard } from "@/components/tester/AccessStatusCard";
import { clearAllCheckpointDismissals } from "@/lib/tester/checkpoint";
import { formatExpiry } from "@/lib/tester/format";
import type { TesterState } from "@/lib/tester/types";
import type { DevSimulateAction } from "@/lib/tester/dev";
import { cn } from "@/lib/utils";

/**
 * Dev QA panel — fast-forward the Founding Tester Programme without waiting days.
 * Available in development, for admins, or when ENABLE_TESTER_DEV_TOOLS=true.
 *
 * /dev/founding-tester
 */
export default function DevFoundingTesterPage() {
  const session = useSupabaseSession();
  const testerCtx = useTesterProgrammeOptional();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [state, setState] = useState<TesterState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(2);

  const load = useCallback(async () => {
    const res = await fetch("/api/tester/dev", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok || !data.enabled) {
      setEnabled(false);
      return;
    }
    setEnabled(true);
    setState(data.state as TesterState);
    await testerCtx?.refresh();
  }, [testerCtx]);

  useEffect(() => {
    if (session?.user) void load();
    else setEnabled(false);
  }, [session?.user, load]);

  const run = async (action: DevSimulateAction, extra?: { sessions?: number }) => {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch("/api/tester/dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, minutes, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Action failed");
        return;
      }
      setState(data.state as TesterState);
      clearAllCheckpointDismissals();
      await testerCtx?.refresh();
      setMessage(`Done: ${action}`);
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(null);
    }
  };

  if (!session?.user) {
    return (
      <Container className="py-16">
        <p className="text-center text-sm text-text-muted">Sign in to use dev tools.</p>
      </Container>
    );
  }

  if (enabled === null) {
    return (
      <Container className="py-16">
        <div className="mx-auto h-32 max-w-2xl animate-pulse rounded-organic-xl bg-surface-subtle" />
      </Container>
    );
  }

  if (!enabled) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-organic-xl bg-surface-elevated p-8 text-center">
          <h1 className="text-xl font-bold text-text">Dev tools disabled</h1>
          <p className="mt-3 text-sm text-text-muted">
            Sign in to use the workflow simulator. (Dev tools are currently
            enabled for all authenticated users.)
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-warning">
            Dev only
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text">
            Founding Tester — workflow simulator
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            Jump to any stage instantly. Active stages use short expiry windows
            (default {minutes} min) so you can test expiration without waiting days.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-organic-xl bg-surface-elevated p-4">
          <label className="text-sm text-text-muted">
            Active stage length (minutes)
            <input
              type="number"
              min={1}
              max={60}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 2)}
              className="mt-1 block w-24 rounded-organic-md bg-surface-subtle px-3 py-2 text-sm text-text focus:outline-none"
            />
          </label>
          <Link
            href="/founding-tester"
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-black"
          >
            Open programme UI
          </Link>
          <button
            type="button"
            onClick={() => {
              clearAllCheckpointDismissals();
              setMessage("Checkpoint dismiss flags cleared — modal will show again.");
            }}
            className="rounded-full bg-surface-mid px-4 py-2 text-sm font-semibold text-text"
          >
            Reset checkpoint dismiss
          </button>
        </div>

        {state ? (
          <div className="flex flex-col gap-3">
            <AccessStatusCard state={state} />
            <div className="rounded-organic-md bg-surface-subtle px-4 py-3 text-xs text-text-muted">
              <p>
                Status: <span className="font-mono text-text">{state.status}</span>
              </p>
              <p>
                Next action:{" "}
                <span className="font-mono text-text">{state.nextAction}</span>
              </p>
              <p>
                Checkpoint:{" "}
                <span className="font-mono text-text">
                  {state.checkpointDue ?? "none"}
                </span>
              </p>
              <p>
                Expires:{" "}
                <span className="text-text">
                  {formatExpiry(state.accessExpiresAt)}
                </span>
              </p>
              <p>
                Sessions:{" "}
                <span className="text-text">
                  {state.meaningfulSessionsCompleted}
                </span>
              </p>
            </div>
          </div>
        ) : null}

        {message ? (
          <p className="rounded-organic-md bg-surface-subtle px-4 py-2 text-sm text-text">
            {message}
          </p>
        ) : null}

        <Section title="Reset">
          <DevButton busy={busy} action="reset" onRun={run} variant="danger">
            Delete programme & start over
          </DevButton>
        </Section>

        <Section title="Jump to stage">
          <div className="flex flex-wrap gap-2">
            <DevButton busy={busy} action="stage_1_survey_pending" onRun={run}>
              Survey pending (joined)
            </DevButton>
            <DevButton busy={busy} action="stage_1_active" onRun={run}>
              Stage 1 active
            </DevButton>
            <DevButton busy={busy} action="stage_1_expired" onRun={run}>
              Stage 1 expired
            </DevButton>
            <DevButton busy={busy} action="stage_2_active" onRun={run}>
              Stage 2 active
            </DevButton>
            <DevButton busy={busy} action="stage_2_expired" onRun={run}>
              Stage 2 expired
            </DevButton>
            <DevButton busy={busy} action="stage_3_active" onRun={run}>
              Stage 3 active
            </DevButton>
            <DevButton busy={busy} action="programme_completed" onRun={run}>
              Programme completed
            </DevButton>
          </div>
        </Section>

        <Section title="Time">
          <div className="flex flex-wrap gap-2">
            <DevButton busy={busy} action="expire_current" onRun={run}>
              Expire current stage now
            </DevButton>
            <DevButton busy={busy} action="sync" onRun={run}>
              Force sync (apply transitions)
            </DevButton>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Tip: activate a stage, wait {minutes} min (or click expire), then
            reload any page to see the login checkpoint modal.
          </p>
        </Section>

        <Section title="Sessions (skip practice)">
          <div className="flex flex-wrap gap-2">
            <DevButton
              busy={busy}
              action="set_sessions"
              onRun={() => run("set_sessions", { sessions: 0 })}
            >
              0 sessions
            </DevButton>
            <DevButton
              busy={busy}
              action="set_sessions"
              onRun={() => run("set_sessions", { sessions: 1 })}
            >
              1 session
            </DevButton>
            <DevButton
              busy={busy}
              action="set_sessions"
              onRun={() => run("set_sessions", { sessions: 3 })}
            >
              3 sessions
            </DevButton>
          </div>
        </Section>

        <Section title="Skip surveys (timestamps only)">
          <div className="flex flex-wrap gap-2">
            <DevButton busy={busy} action="mark_feedback_done" onRun={run}>
              Mark Stage 1 feedback done
            </DevButton>
            <DevButton busy={busy} action="mark_final_done" onRun={run}>
              Mark final survey done
            </DevButton>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            After marking feedback + 1 session, click Force sync to grant Stage 2.
            After final + 3 sessions, sync grants Stage 3 (if config allows).
          </p>
        </Section>

        <Section title="Suggested test paths">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-text-muted">
            <li>
              <strong className="text-text">Full UI path:</strong> Reset → open
              programme UI → join + real surveys.
            </li>
            <li>
              <strong className="text-text">Checkpoint after Stage 1:</strong>{" "}
              Stage 1 active → Expire now → Sync → visit home (modal should
              appear).
            </li>
            <li>
              <strong className="text-text">Unlock Stage 2:</strong> Stage 1
              expired → 1 session → Mark feedback done → Sync.
            </li>
            <li>
              <strong className="text-text">Unlock Stage 3:</strong> Stage 2
              expired → 3 sessions → Mark final done → Sync.
            </li>
          </ol>
        </Section>
      </div>
    </Container>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-organic-xl bg-surface-elevated p-5">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-text-muted">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function DevButton({
  children,
  action,
  busy,
  onRun,
  variant = "default",
}: {
  children: React.ReactNode;
  action: DevSimulateAction;
  busy: string | null;
  onRun: (action: DevSimulateAction) => void;
  variant?: "default" | "danger";
}) {
  const isBusy = busy === action;
  return (
    <button
      type="button"
      disabled={!!busy}
      onClick={() => onRun(action)}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-50",
        variant === "danger"
          ? "bg-error/20 text-error"
          : "bg-surface-mid text-text hover:opacity-90",
      )}
    >
      {isBusy ? "…" : children}
    </button>
  );
}
