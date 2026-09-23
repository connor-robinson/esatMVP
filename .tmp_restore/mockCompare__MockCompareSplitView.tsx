"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatCompareTime } from "@/lib/mockCompare/demo";
import type {
  MockCompareParticipant,
  MockCompareResults,
  MockCompareRoom,
} from "@/lib/mockCompare/types";

type MockCompareSplitViewProps = {
  room: MockCompareRoom;
  meId: string;
  /** Local results while waiting for server round-trip. */
  localResults?: MockCompareResults | null;
  isLoggedIn?: boolean;
  loginHref?: string;
  className?: string;
  onSeedDemoFriend?: () => void;
  seeding?: boolean;
};

function StatBlock({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[88px] flex-col items-center justify-center rounded-md px-3 py-4",
        accent ? "bg-maths text-neutral-900" : "bg-surface-elevated text-neutral-100",
      )}
    >
      <div
        className={cn(
          "font-bold leading-none tracking-tight",
          accent ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
        )}
      >
        {value}
      </div>
      {sub ? (
        <div
          className={cn(
            "mt-1 text-xs",
            accent ? "text-neutral-800/80" : "text-neutral-400",
          )}
        >
          {sub}
        </div>
      ) : null}
      <div
        className={cn(
          "mt-2 text-[11px] font-medium uppercase tracking-wide",
          accent ? "opacity-90" : "text-neutral-400",
        )}
      >
        {label}
      </div>
    </div>
  );
}

function ParticipantColumn({
  title,
  subtitle,
  results,
  waitingLabel,
  highlight,
}: {
  title: string;
  subtitle?: string;
  results: MockCompareResults | null;
  waitingLabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 flex-1 space-y-3 rounded-md p-4",
        highlight ? "bg-surface-mid/60" : "bg-surface",
      )}
    >
      <div>
        <div className="text-lg font-semibold text-text">{title}</div>
        {subtitle ? (
          <div className="text-xs text-text-muted">{subtitle}</div>
        ) : null}
      </div>

      {!results ? (
        <div className="rounded-md bg-surface-elevated px-4 py-10 text-center text-sm text-text-muted">
          {waitingLabel}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <StatBlock
            label="Predicted /9"
            value={
              results.predictedScore != null
                ? results.predictedScore.toFixed(1)
                : "—"
            }
            accent
          />
          <StatBlock
            label="Accuracy"
            value={`${results.accuracyPct}%`}
            sub={`${results.correctCount}/${results.totalQuestions} correct`}
          />
          <StatBlock
            label="Avg / question"
            value={formatCompareTime(results.avgSecPerQuestion)}
          />
          <StatBlock
            label="Flagged"
            value={`${results.flaggedCount}/${results.totalQuestions}`}
          />
        </div>
      )}
    </div>
  );
}

function deltaLabel(mine: number, theirs: number, higherIsBetter = true): string {
  const d = mine - theirs;
  if (d === 0) return "Tied";
  const better = higherIsBetter ? d > 0 : d < 0;
  const abs = Math.abs(d);
  const formatted =
    Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return better ? `You +${formatted}` : `Friend +${formatted}`;
}

function QuestionGrid({
  me,
  friend,
}: {
  me: MockCompareResults;
  friend: MockCompareResults;
}) {
  const total = Math.max(me.totalQuestions, friend.totalQuestions);
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-text">Question by question</div>
      <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-27">
        {Array.from({ length: total }, (_, i) => {
          const a = me.perQuestionCorrect[i];
          const b = friend.perQuestionCorrect[i];
          let tone = "bg-neutral-700 text-neutral-300";
          if (a && b) tone = "bg-emerald-600/80 text-white";
          else if (a && !b) tone = "bg-sky-600/80 text-white";
          else if (!a && b) tone = "bg-rose-600/70 text-white";
          else if (a === false && b === false) tone = "bg-neutral-600 text-neutral-200";
          return (
            <div
              key={i}
              title={`Q${i + 1}: you ${a ? "✓" : "✗"} · friend ${b ? "✓" : "✗"}`}
              className={cn(
                "flex aspect-square items-center justify-center rounded text-[10px] font-semibold",
                tone,
              )}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-emerald-600/80" /> Both right
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-sky-600/80" /> Only you
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-rose-600/70" /> Only friend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-neutral-600" /> Both wrong
        </span>
      </div>
    </div>
  );
}

function resolveSides(
  room: MockCompareRoom,
  meId: string,
  localResults?: MockCompareResults | null,
): { me: MockCompareParticipant | null; friend: MockCompareParticipant | null } {
  const me =
    room.participants.find((p) => p.participantId === meId) ??
    room.participants[0] ??
    null;
  const friend =
    room.participants.find((p) => p.participantId !== (me?.participantId ?? meId)) ??
    null;

  if (me && localResults && !me.results) {
    return {
      me: { ...me, status: "completed", results: localResults },
      friend,
    };
  }
  return { me, friend };
}

export function MockCompareSplitView({
  room,
  meId,
  localResults,
  isLoggedIn = false,
  loginHref = "/login?redirectTo=/past-papers/mark",
  className,
  onSeedDemoFriend,
  seeding,
}: MockCompareSplitViewProps) {
  const { me, friend } = resolveSides(room, meId, localResults);
  const meResults = me?.results ?? null;
  const friendResults = friend?.results ?? null;
  const bothDone = Boolean(meResults && friendResults);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-text">{room.paperLabel}</div>
          <div className="text-xs text-text-muted">
            Compare · 2 players max · no account needed for these stats
          </div>
        </div>
        {onSeedDemoFriend && !friendResults ? (
          <button
            type="button"
            onClick={onSeedDemoFriend}
            disabled={seeding}
            className="rounded-md bg-surface-elevated px-3 py-2 text-xs font-medium text-text hover:bg-surface-mid disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Preview: simulate friend"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <ParticipantColumn
          title={me?.displayName ? `${me.displayName} (you)` : "You"}
          subtitle={me?.status === "in_progress" ? "In progress" : undefined}
          results={meResults}
          waitingLabel="Finish the mock to see your side."
          highlight
        />
        <ParticipantColumn
          title={friend?.displayName ?? "Friend"}
          subtitle={
            !friend
              ? "Waiting for them to join the link"
              : friend.status === "in_progress"
                ? "Sitting the mock…"
                : friend.status === "joined"
                  ? "Joined · not started yet"
                  : undefined
          }
          results={friendResults}
          waitingLabel={
            friend
              ? "Waiting for your friend to finish…"
              : "Share the link — waiting for a friend to join."
          }
        />
      </div>

      {bothDone && meResults && friendResults ? (
        <div className="space-y-4 rounded-md bg-surface p-4">
          <div className="text-sm font-semibold text-text">Head to head</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-surface-elevated px-3 py-3 text-center">
              <div className="text-xs text-text-muted">Predicted /9</div>
              <div className="mt-1 text-sm font-semibold text-text">
                {deltaLabel(
                  meResults.predictedScore ?? 0,
                  friendResults.predictedScore ?? 0,
                )}
              </div>
            </div>
            <div className="rounded-md bg-surface-elevated px-3 py-3 text-center">
              <div className="text-xs text-text-muted">Accuracy</div>
              <div className="mt-1 text-sm font-semibold text-text">
                {deltaLabel(meResults.accuracyPct, friendResults.accuracyPct)}
              </div>
            </div>
            <div className="rounded-md bg-surface-elevated px-3 py-3 text-center">
              <div className="text-xs text-text-muted">Avg time</div>
              <div className="mt-1 text-sm font-semibold text-text">
                {deltaLabel(
                  meResults.avgSecPerQuestion,
                  friendResults.avgSecPerQuestion,
                  false,
                )}
              </div>
            </div>
            <div className="rounded-md bg-surface-elevated px-3 py-3 text-center">
              <div className="text-xs text-text-muted">Raw marks</div>
              <div className="mt-1 text-sm font-semibold text-text">
                {deltaLabel(meResults.correctCount, friendResults.correctCount)}
              </div>
            </div>
          </div>
          <QuestionGrid me={meResults} friend={friendResults} />
        </div>
      ) : null}

      {!isLoggedIn ? (
        <div className="rounded-md bg-surface-elevated px-4 py-4">
          <div className="text-sm font-semibold text-text">
            Sign in for deeper stats
          </div>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Free guest compare shows score, accuracy, pacing and the question
            grid. Sign in to unlock detailed pacing charts, mistake tags, and
            saved history.
          </p>
          <Link
            href={loginHref}
            className="mt-3 inline-flex rounded-md bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent/90"
          >
            Sign up / Sign in
          </Link>
        </div>
      ) : null}
    </div>
  );
}
