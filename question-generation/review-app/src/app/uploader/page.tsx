"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

type CodePreview = {
  stemPreview: string;
  subjects: string | null;
  primary_tag: string | null;
  schema_id: string | null;
  difficulty: string | null;
};

const CODE_OK = /^[A-Z]{2}\d{2}$/;

export default function WalkthroughUploaderPage() {
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "err">("idle");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<CodePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);

  useEffect(() => {
    const c = code.trim().toUpperCase();
    if (!CODE_OK.test(c)) {
      setPreview(null);
      setPreviewErr(null);
      setPreviewLoading(false);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(() => {
      setPreviewLoading(true);
      setPreviewErr(null);
      setPreview(null);

      void fetch("/api/upload-walkthrough/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      })
        .then(async (r) => {
          const j = (await r.json()) as CodePreview & { error?: string };
          if (cancelled) return;
          if (!r.ok) {
            throw new Error(j.error || `Could not look up code (${r.status})`);
          }
          setPreview({
            stemPreview: j.stemPreview || "",
            subjects: j.subjects ?? null,
            primary_tag: j.primary_tag ?? null,
            schema_id: j.schema_id ?? null,
            difficulty: j.difficulty ?? null,
          });
        })
        .catch((e: unknown) => {
          if (!cancelled) {
            setPreviewErr(e instanceof Error ? e.message : String(e));
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [code]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!file) {
      setStatus("err");
      setMessage("Choose a video file.");
      return;
    }

    const c = code.trim().toUpperCase();
    if (!CODE_OK.test(c)) {
      setStatus("err");
      setMessage("Enter the 4-character code (e.g. AB12).");
      return;
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) {
      setStatus("err");
      setMessage("App is missing Supabase public env vars.");
      return;
    }

    setStatus("busy");
    try {
      const prepRes = await fetch("/api/upload-walkthrough/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: c,
          filename: file.name || "video.mp4",
        }),
      });
      const prep = (await prepRes.json()) as {
        error?: string;
        path?: string;
        token?: string;
      };
      if (!prepRes.ok) {
        throw new Error(prep.error || "Could not start upload");
      }
      if (!prep.path || !prep.token) {
        throw new Error("Invalid prepare response");
      }

      const supabase = createClient(url, anon);
      const { error: upErr } = await supabase.storage
        .from("question-media")
        .uploadToSignedUrl(prep.path, prep.token, file);

      if (upErr) {
        throw new Error(upErr.message || "Upload to storage failed");
      }

      const doneRes = await fetch("/api/upload-walkthrough/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: prep.path }),
      });
      const done = (await doneRes.json()) as { error?: string };
      if (!doneRes.ok) {
        throw new Error(done.error || "Could not link video to question");
      }

      setStatus("ok");
      setMessage(
        "Uploaded. On the laptop review page, refresh or reopen this question to watch the video."
      );
      setCode("");
      setFile(null);
      setPreview(null);
      setPreviewErr(null);
    } catch (err: unknown) {
      setStatus("err");
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md">
        <h1 className="text-xl font-bold text-white mb-1">Walkthrough video</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Record <strong className="text-slate-200">screen + microphone</strong>{" "}
          in one file. Enter the code from the question review page — a short
          preview appears so you can confirm it is the right question — then
          choose your video.
        </p>

        {message && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              status === "ok"
                ? "bg-emerald-950/80 text-emerald-100 border border-emerald-700"
                : "bg-red-950/80 text-red-100 border border-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="code"
              className="block text-xs font-semibold text-slate-400 mb-2"
            >
              Code
            </label>
            <input
              id="code"
              name="code"
              maxLength={4}
              autoComplete="off"
              placeholder="AB12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border-2 border-sky-500 bg-slate-900 px-3 py-4 text-center text-3xl font-bold tracking-[0.25em] text-white placeholder:text-slate-600 uppercase"
            />
            {previewLoading && (
              <p className="mt-2 text-xs text-slate-500">Checking code…</p>
            )}
            {previewErr && CODE_OK.test(code.trim().toUpperCase()) && (
              <p className="mt-2 text-xs text-amber-200/90">{previewErr}</p>
            )}
            {preview && !previewLoading && (
              <div className="mt-3 rounded-xl border border-emerald-700/50 bg-emerald-950/40 px-3 py-3 text-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 mb-2">
                  Matches this question
                </p>
                <p className="text-slate-200 leading-snug whitespace-pre-wrap">
                  {preview.stemPreview || "(Empty stem)"}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 font-mono">
                  {preview.subjects ? <span>{preview.subjects}</span> : null}
                  {preview.difficulty ? (
                    <span className="text-purple-300">{preview.difficulty}</span>
                  ) : null}
                  {preview.primary_tag ? (
                    <span className="text-sky-300 truncate max-w-full">
                      {preview.primary_tag}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          <div>
            <label
              htmlFor="video"
              className="block text-xs font-semibold text-slate-400 mb-2"
            >
              Video
            </label>
            <input
              id="video"
              name="video"
              type="file"
              accept="video/*,.mov,.mp4,.m4v,.webm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950"
            />
          </div>
          <button
            type="submit"
            disabled={status === "busy"}
            className="w-full rounded-xl bg-gradient-to-b from-sky-400 to-sky-600 py-4 text-base font-bold text-slate-950 disabled:opacity-50"
          >
            {status === "busy" ? "Uploading…" : "Upload"}
          </button>
        </form>
      </div>
    </div>
  );
}
