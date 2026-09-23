"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapPart, RoadmapStage } from "@/lib/papers/roadmapConfig";
import type { RoadmapStartOptions } from "@/components/papers/roadmap/StageListCard";
import {
  createCompareRoom,
  getSavedDisplayName,
  markCompareStarted,
  saveDisplayName,
  setActiveMockCompare,
} from "@/lib/mockCompare/client";

type Props = {
  open: boolean;
  stage: RoadmapStage;
  selectedParts: RoadmapPart[];
  options: RoadmapStartOptions;
  onClose: () => void;
  onStartSitting: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
};

function stageLabel(stage: RoadmapStage): string {
  if (stage.label) return stage.label;
  return `${stage.examName} ${stage.year}`;
}

export function CompareInviteModal({
  open,
  stage,
  selectedParts,
  options,
  onClose,
  onStartSitting,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paperLabel = `${stageLabel(stage)} · ${selectedParts
    .map((p) => p.displayName || p.partName)
    .join(", ")}`;

  useEffect(() => {
    if (!open) return;
    setDisplayName(getSavedDisplayName() || "");
    setRoomId(null);
    setParticipantId(null);
    setShareUrl("");
    setError(null);
    setCopied(false);
  }, [open, stage.id]);

  if (!open) return null;

  const createRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const name = displayName.trim() || "Player 1";
      saveDisplayName(name);
      const data = await createCompareRoom({
        displayName: name,
        paperLabel,
        roadmapStart: {
          stageId: stage.id,
          selectedParts,
          options,
        },
      });
      setRoomId(data.room.roomId);
      setParticipantId(data.participantId);
      setShareUrl(
        `${window.location.origin}/esat-mock-tests/compare/${data.room.roomId}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy link");
    }
  };

  const startMine = async () => {
    if (!roomId || !participantId) return;
    setBusy(true);
    setError(null);
    try {
      setActiveMockCompare({
        roomId,
        participantId,
        displayName: displayName.trim() || "You",
        paperLabel,
      });
      await markCompareStarted(roomId, participantId);
      onStartSitting(stage, selectedParts, options);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start");
      setBusy(false);
    }
  };

  return (
    <div
      className="past-papers-theme fixed inset-0 z-[110] flex items-center justify-center p-4 font-sans sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-invite-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-[111] w-full max-w-md overflow-hidden rounded-sm bg-surface-elevated shadow-modal-card">
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-sm bg-surface-mid text-text">
              <Users className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <h2
                id="compare-invite-title"
                className="text-lg font-semibold text-text"
              >
                Compare with a friend
              </h2>
              <p className="mt-1 text-sm text-text-muted">{paperLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p className="text-sm leading-relaxed text-text-muted">
            Uses the papers and timing you just chose. Send the link — compare
            when you both finish. No signup needed.
          </p>

          {error ? (
            <div className="rounded-sm bg-rose-500/15 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          {!roomId ? (
            <>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-text-muted">
                  Your name
                </span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Anson"
                  maxLength={32}
                  className="w-full rounded-sm bg-surface-mid px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void createRoom()}
                className="w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {busy ? "Creating link…" : "Create share link"}
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={shareUrl}
                  className="min-w-0 flex-1 rounded-sm bg-surface-mid px-3 py-2.5 text-xs text-text focus-visible:outline-none"
                />
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center justify-center gap-2 rounded-sm bg-surface-mid px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-neutral"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void startMine()}
                className={cn(
                  "w-full rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50",
                )}
              >
                {busy ? "Starting…" : "Start my attempt"}
              </button>
              <p className="text-xs text-text-subtle">
                Your friend opens the link and starts the same paper. You can
                start before they join.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
