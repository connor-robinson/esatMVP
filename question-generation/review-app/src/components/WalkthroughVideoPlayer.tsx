"use client";

import { useEffect, useRef, useState } from "react";
import {
  getWalkthroughPlaybackEndSec,
  walkthroughClipPathStyle,
} from "@/lib/walkthroughVideoDisplay";

type WalkthroughVideoPlayerProps = {
  questionId: string;
  storagePath: string | null | undefined;
};

/**
 * Fetches a signed URL and plays the walkthrough with:
 * - vertical crop: top 8.2% and bottom 10.2% of frame height (via clip-path)
 * - trim: last 2 seconds are not played (clamp seek + timeupdate)
 */
export function WalkthroughVideoPlayer({
  questionId,
  storagePath,
}: WalkthroughVideoPlayerProps) {
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackEndSecRef = useRef(0);

  useEffect(() => {
    if (!storagePath?.trim()) {
      setPlayUrl(null);
      setLoadErr(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    setPlayUrl(null);

    void fetch(
      `/api/review/walkthrough-play-url?questionId=${encodeURIComponent(questionId)}`
    )
      .then(async (r) => {
        const j = (await r.json()) as { url?: string; error?: string };
        if (!r.ok) {
          throw new Error(j.error || `HTTP ${r.status}`);
        }
        if (!j.url) {
          throw new Error("No playback URL returned");
        }
        if (!cancelled) {
          setPlayUrl(j.url);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadErr(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [questionId, storagePath]);

  const clampToEffectiveEnd = () => {
    const v = videoRef.current;
    const end = playbackEndSecRef.current;
    if (!v || !Number.isFinite(end) || end <= 0) return;
    if (v.currentTime > end) {
      v.currentTime = end;
      v.pause();
    }
  };

  if (!storagePath?.trim()) {
    return (
      <div className="mx-4 mb-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/45">
        No walkthrough video linked yet. After uploading from iPad, refresh this page
        (or reopen the question from the list) to load the recording.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-4 mb-2 text-xs text-white/40">Loading walkthrough video…</div>
    );
  }

  if (loadErr) {
    return (
      <div className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs text-red-200/90">
        Could not load video: {loadErr}
      </div>
    );
  }

  if (!playUrl) {
    return null;
  }

  return (
    <div className="mx-4 mb-3 space-y-2">
      <p className="text-xs font-mono text-white/50 uppercase tracking-wide">
        Walkthrough recording
      </p>
      <div className="overflow-hidden rounded-lg border border-white/15 bg-black">
        <video
          ref={videoRef}
          className="block w-full max-h-[min(50vh,360px)] h-auto bg-black"
          style={walkthroughClipPathStyle()}
          controls
          playsInline
          preload="metadata"
          src={playUrl}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            playbackEndSecRef.current = getWalkthroughPlaybackEndSec(v.duration);
          }}
          onTimeUpdate={clampToEffectiveEnd}
          onSeeked={clampToEffectiveEnd}
        />
      </div>
    </div>
  );
}
