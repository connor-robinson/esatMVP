"use client";

import type { RefObject } from "react";
import { semicircleInscribedRectangleSvg } from "@/lib/diagrams/semicircleRectangle";
import {
  coordinateGraphSvg,
  type GraphPresetId,
} from "@/lib/diagrams/coordinateGraph";

function insertAtCursor(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
  snippet: string,
  onChange: (v: string) => void
) {
  const el = ref.current;
  if (!el) {
    onChange(value + snippet);
    return;
  }
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const next = value.slice(0, start) + snippet + value.slice(end);
  onChange(next);
  queueMicrotask(() => {
    el.focus();
    const pos = start + snippet.length;
    el.setSelectionRange(pos, pos);
  });
}

interface DiagramInsertToolbarProps {
  stemRef: RefObject<HTMLTextAreaElement | null>;
  stemValue: string;
  onStemChange: (v: string) => void;
}

const btnClass =
  "rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80 hover:bg-white/10 hover:text-white transition-colors";

export function DiagramInsertToolbar({
  stemRef,
  stemValue,
  onStemChange,
}: DiagramInsertToolbarProps) {
  const insert = (snippet: string) => {
    const pad =
      stemValue.length > 0 &&
      !stemValue.endsWith("\n") &&
      !snippet.startsWith("\n")
        ? "\n"
        : "";
    insertAtCursor(stemRef, stemValue, pad + snippet, onStemChange);
  };

  const graphPresets: { id: GraphPresetId; label: string }[] = [
    { id: "parabola", label: "Parabola" },
    { id: "sin", label: "sin x" },
    { id: "cos", label: "cos x" },
    { id: "cubic", label: "Cubic" },
    { id: "exp", label: "exp" },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-organic-md border border-white/10 bg-white/[0.03] px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-white/45 uppercase tracking-wide shrink-0">
          Diagrams
        </span>
        <button
          type="button"
          className={btnClass}
          title="Rectangle on diameter, max area (h/w = 1/2)"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insert("\n" + semicircleInscribedRectangleSvg() + "\n")}
        >
          Semicircle + rectangle
        </button>
        <button
          type="button"
          className={btnClass}
          title="Same diagram with dashed radius and R label"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            insert(
              "\n" +
                semicircleInscribedRectangleSvg({ showRadius: true }) +
                "\n"
            )
          }
        >
          + radius R
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
        <span className="text-[11px] font-mono text-white/45 uppercase tracking-wide shrink-0">
          Graphs
        </span>
        {graphPresets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={btnClass}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() =>
              insert("\n" + coordinateGraphSvg({ preset: p.id }) + "\n")
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-white/35 leading-snug">
        Inserts raw SVG at the cursor; edit numbers or labels in the textarea. Preview uses
        math rendering between SVG blocks.
      </p>
    </div>
  );
}
