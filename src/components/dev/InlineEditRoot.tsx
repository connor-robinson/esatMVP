"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const EDITABLE_SELECTOR = [
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "li",
  "td",
  "th",
  "figcaption",
  "dt",
  "dd",
  "span",
  "summary",
].join(",");

function isEditableTarget(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("a, button, input, textarea, select, script, style, svg, nav, footer")) {
    return false;
  }
  if (el.closest("[data-inline-edit-ui]")) return false;
  const text = el.innerText?.trim() ?? "";
  if (text.length < 2) return false;
  // Prefer leaf-ish text blocks: skip containers with many block children
  const blockKids = el.querySelectorAll("p, h1, h2, h3, h4, li, table").length;
  if (blockKids > 0 && ["DIV", "SECTION", "ARTICLE"].includes(el.tagName)) {
    return false;
  }
  return true;
}

/**
 * Localhost copy editor. Open any page with `?edit=1`.
 * Click text to edit. Ctrl/Cmd+S saves into source files + an HTML snapshot.
 */
export function InlineEditRoot() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const enabled = searchParams.get("edit") === "1";

  const [dirty, setDirty] = useState<DirtyEdit[]>([]);
  const [status, setStatus] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<SaveResult | null>(null);

  const dirtyCount = dirty.length;

  const upsertDirty = useCallback((find: string, replace: string) => {
    const nextFind = find.replace(/\u00a0/g, " ").trimEnd();
    const nextReplace = replace.replace(/\u00a0/g, " ").trimEnd();
    if (!nextFind || nextFind === nextReplace) return;
    setDirty((prev) => {
      const without = prev.filter((item) => item.find !== nextFind);
      return [...without, { find: nextFind, replace: nextReplace }];
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const originals = new WeakMap<HTMLElement, string>();

    const markEditable = (root: ParentNode) => {
      root.querySelectorAll(EDITABLE_SELECTOR).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (!isEditableTarget(node)) return;
        if (node.dataset.inlineEditReady === "1") return;
        node.dataset.inlineEditReady = "1";
        node.contentEditable = "true";
        node.spellcheck = true;
        node.style.outline = "none";
        node.style.boxShadow = "inset 0 0 0 1px rgba(59, 130, 246, 0.35)";
        node.style.borderRadius = "4px";
        originals.set(node, node.innerText);

        node.addEventListener("focus", () => {
          if (!originals.has(node)) originals.set(node, node.innerText);
        });

        node.addEventListener("blur", () => {
          const original = originals.get(node);
          if (original == null) return;
          const current = node.innerText;
          if (current !== original) {
            upsertDirty(original, current);
            originals.set(node, current);
          }
        });
      });
    };

    markEditable(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) markEditable(node);
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      document.querySelectorAll<HTMLElement>("[data-inline-edit-ready='1']").forEach((el) => {
        el.contentEditable = "false";
        el.style.boxShadow = "";
        delete el.dataset.inlineEditReady;
      });
    };
  }, [enabled, upsertDirty]);

  const save = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    setStatus("Saving…");

    // Flush any focused editor before save
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.isContentEditable) {
      active.blur();
    }

    // Small delay so blur handlers commit into dirty state
    await new Promise((r) => setTimeout(r, 50));

    const article =
      document.querySelector("main") ??
      document.querySelector("[class*='max-w-4xl']") ??
      document.body;

    const html = article instanceof HTMLElement ? article.innerHTML : "";

    try {
      const res = await fetch("/api/dev/inline-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pagePath: pathname || "/esat-preparation",
          html,
          replacements: dirty,
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
          `Saved HTML snapshot${data.snapshotPath ? ` → ${data.snapshotPath}` : ""}. Source patches: ${applied} applied, ${skipped} skipped.`,
        );
        setDirty([]);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [dirty, pathname, saving]);

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

  const tip = useMemo(() => {
    if (!enabled) return null;
    return "Click any text to edit. Ctrl/Cmd+S saves to source + HTML snapshot.";
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      data-inline-edit-ui="1"
      className="fixed bottom-4 left-1/2 z-[9999] w-[min(40rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl bg-[#0F172A] px-4 py-3 text-sm text-white shadow-2xl shadow-black/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-[#93C5FD]">Inline edit · localhost</p>
          <p className="mt-0.5 text-xs text-[#94A3B8]">{tip}</p>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-[#3B82F6] px-4 py-2 font-bold text-white hover:bg-[#2563EB] disabled:opacity-60"
        >
          {saving ? "Saving…" : dirtyCount ? `Save (${dirtyCount})` : "Save HTML"}
        </button>
      </div>
      {status ? (
        <p className="mt-2 text-xs leading-relaxed text-[#CBD5E1]">{status}</p>
      ) : null}
      {lastResult?.skipped?.length ? (
        <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-[#FBBF24]">
          {lastResult.skipped.map((item) => (
            <li key={item.find.slice(0, 40)}>
              Skipped: {item.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
