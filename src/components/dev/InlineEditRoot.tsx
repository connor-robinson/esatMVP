"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type DirtyEdit = {
  find: string;
  replace: string;
};

type SaveResult = {
  ok: boolean;
  snapshotPath?: string | null;
  applied?: { file: string }[];
  skipped?: { find: string; reason: string }[];
  error?: string;
};

/**
 * Localhost copy editor.
 *
 * Open with `?edit=1`, or click "Enable edit" on any localhost page.
 * Uses document.designMode so text is actually editable (React-safe).
 * Ctrl/Cmd+S saves an HTML snapshot + unique source-string patches.
 */
export function InlineEditRoot() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const fromQuery = searchParams.get("edit") === "1";

  const [enabled, setEnabled] = useState(false);
  const [dirty, setDirty] = useState<DirtyEdit[]>([]);
  const [baselineHtml, setBaselineHtml] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<SaveResult | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    setIsLocalhost(
      host === "localhost" || host === "127.0.0.1" || host === "::1",
    );
    if (fromQuery || new URLSearchParams(window.location.search).get("edit") === "1") {
      setEnabled(true);
    }
  }, [fromQuery]);

  useEffect(() => {
    if (!enabled || !isLocalhost) return;

    const previous = document.designMode;
    document.designMode = "on";
    document.body.style.cursor = "text";
    setBaselineHtml(document.body.innerHTML);
    setStatus("Edit mode on. Click any text and type. Then Save.");

    // Keep chrome non-editable and stop accidental navigation while editing
    const onClickCapture = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-inline-edit-ui]")) return;
      const link = target.closest("a");
      if (link) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClickCapture, true);

    return () => {
      document.designMode = previous || "off";
      document.body.style.cursor = "";
      document.removeEventListener("click", onClickCapture, true);
    };
  }, [enabled, isLocalhost]);

  const captureDirtyFromDom = useCallback(() => {
    // Heuristic: collect changed leaf text by comparing against data-original if set.
    // designMode edits don't give us clean find/replace pairs, so we also always
    // save the HTML snapshot. For source patches, try matching visible text blocks
    // that differ from a snapshot taken at enable-time via MutationObserver trail.
    return dirty;
  }, [dirty]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setStatus("Saving…");

    const main =
      document.querySelector("main") ??
      document.querySelector("[class*='max-w-4xl']") ??
      document.body;
    const html = main instanceof HTMLElement ? main.innerHTML : "";

    // Build replacements from elements that carry a recorded original
    const replacements: DirtyEdit[] = [...captureDirtyFromDom()];
    document.querySelectorAll<HTMLElement>("[data-inline-original]").forEach((el) => {
      const find = el.dataset.inlineOriginal ?? "";
      const replace = el.innerText;
      if (find && replace && find !== replace) {
        replacements.push({ find, replace });
      }
    });

    try {
      const res = await fetch("/api/dev/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: pathname || window.location.pathname,
          html,
          replacements,
          baselineHtml: baselineHtml.slice(0, 0), // unused; keep payload small
        }),
      });
      const data = (await res.json()) as SaveResult;
      setLastResult(data);
      if (!res.ok || !data.ok) {
        setStatus(data.error || "Save failed.");
      } else {
        const applied = data.applied?.length ?? 0;
        const skipped = data.skipped?.length ?? 0;
        setStatus(
          `Saved. HTML → ${data.snapshotPath ?? "tmp/inline-edits"}. Source: ${applied} patched, ${skipped} skipped.`,
        );
        setDirty([]);
        // Refresh originals after successful save
        document.querySelectorAll<HTMLElement>("[data-inline-original]").forEach((el) => {
          el.dataset.inlineOriginal = el.innerText;
        });
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [baselineHtml, captureDirtyFromDom, pathname, saving]);

  // Stamp originals on focus so we can patch source on save
  useEffect(() => {
    if (!enabled || !isLocalhost) return;

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-inline-edit-ui]")) return;
      if (!target.dataset.inlineOriginal) {
        target.dataset.inlineOriginal = target.innerText;
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-inline-edit-ui]")) return;
      const find = target.dataset.inlineOriginal;
      if (!find) return;
      const replace = target.innerText;
      if (find === replace) return;
      setDirty((prev) => {
        const without = prev.filter((item) => item.find !== find);
        return [...without, { find, replace }];
      });
    };

    document.addEventListener("focusin", onFocusIn, true);
    document.addEventListener("focusout", onFocusOut, true);
    return () => {
      document.removeEventListener("focusin", onFocusIn, true);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [enabled, isLocalhost]);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, save]);

  if (!isLocalhost) return null;

  if (!enabled) {
    return (
      <div
        data-inline-edit-ui="1"
        contentEditable={false}
        className="fixed bottom-4 right-4 z-[9999]"
      >
        <button
          type="button"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set("edit", "1");
            window.history.replaceState({}, "", url.toString());
            setEnabled(true);
          }}
          className="rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#2563EB]"
        >
          Enable inline edit
        </button>
      </div>
    );
  }

  return (
    <div
      data-inline-edit-ui="1"
      contentEditable={false}
      suppressContentEditableWarning
      className="fixed bottom-4 left-1/2 z-[9999] w-[min(42rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm text-white shadow-2xl shadow-black/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-[#93C5FD]">Inline edit · designMode on</p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">
            Click any text and type. Ctrl/Cmd+S saves HTML + source patches.
            {dirty.length ? ` (${dirty.length} text change${dirty.length === 1 ? "" : "s"} queued)` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              document.designMode = "off";
              setEnabled(false);
              const url = new URL(window.location.href);
              url.searchParams.delete("edit");
              window.history.replaceState({}, "", url.toString());
            }}
            className="rounded-xl bg-white/10 px-3 py-2 font-bold text-white hover:bg-white/15"
          >
            Exit
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="rounded-xl bg-[#3B82F6] px-4 py-2 font-bold text-white hover:bg-[#2563EB] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      {status ? (
        <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">{status}</p>
      ) : null}
      {lastResult?.skipped?.length ? (
        <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-[#FBBF24]">
          {lastResult.skipped.slice(0, 6).map((item) => (
            <li key={item.find.slice(0, 48)}>
              Skipped: {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
