"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MistakeSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
  onCreateOption?: (label: string) => void;
  placeholder?: string;
  className?: string;
}

export function MistakeSelect({ value, onChange, options, onCreateOption, placeholder = "Add mistake tags…", className }: MistakeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const normalized = useMemo(() => options.map(o => o.trim()).filter(Boolean), [options]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return normalized;
    return normalized.filter(o => o.toLowerCase().includes(q));
  }, [normalized, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = e.target as Node;
      const insideTrigger = !!(ref.current && ref.current.contains(el));
      const insidePanel = !!(panelRef.current && panelRef.current.contains(el));
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Position dropdown as fixed so it can float over other cards
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    if (!el) return;
    const btn = el.querySelector('button');
    if (!btn) return;
    const update = () => {
      const r = (btn as HTMLElement).getBoundingClientRect();
      setPanelPos({ top: r.bottom + 4, left: Math.max(8, r.left), width: r.width });
      rafRef.current = null;
    };
    update();
    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [open]);

  const toggle = (label: string) => {
    const exists = value.includes(label);
    const next = exists ? value.filter(v => v !== label) : [...value, label];
    onChange(next);
  };

  const createIfNeeded = () => {
    const label = query.trim();
    if (!label) return;
    if (!normalized.includes(label)) onCreateOption?.(label);
    if (!value.includes(label)) onChange([...value, label]);
    setQuery("");
  };

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        className="px-2 py-1.5 text-xs rounded-md bg-[#151921] text-neutral-300 hover:bg-[#171b23] flex items-center justify-between gap-1 focus:outline-none w-32 sm:w-36 flex-shrink-0"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={`truncate ${value.length === 0 ? 'text-neutral-500' : 'text-neutral-200'}`}>
          {value.length === 0 && '0 mistakes selected'}
          {value.length === 1 && value[0]}
          {value.length >= 2 && `${value.length}+ mistakes selected`}
        </span>
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && panelPos && createPortal(
        <div ref={panelRef} className="fixed rounded-md bg-[#0f1114] shadow-lg p-2" style={{ top: panelPos.top, left: panelPos.left, width: 180, zIndex: 2147483647 }}>
          <div className="flex items-center gap-1 mb-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createIfNeeded(); }} }
              placeholder={placeholder}
              className="flex-1 px-2 py-1.5 text-xs rounded-md bg-[#151921] text-neutral-200 placeholder:text-neutral-500 outline-none"
            />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); createIfNeeded(); }}
              className="px-2 py-1 rounded-md text-xs bg-[#151921] text-neutral-300 hover:bg-[#171b23] focus:outline-none"
              title="Add tag"
            >
              +
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <button className="w-full text-left px-2 py-1 text-xs rounded-md bg-[#151921] text-neutral-300" onClick={createIfNeeded}>
                Create “{query.trim()}”
              </button>
            )}
            {filtered.map(opt => {
              const active = value.includes(opt);
              return (
                <button
                  key={opt}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition flex items-center justify-between ${active ? 'bg-[rgba(80,97,65,0.18)] text-neutral-100' : 'bg-transparent text-neutral-300 hover:bg-[#141820]'}`}
                  onClick={(e) => { e.preventDefault(); toggle(opt); }}
                >
                  <span>{opt}</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-[4px]" style={{ backgroundColor: active ? '#506141' : 'rgba(255,255,255,0.08)' }} />
                </button>
              );
            })}
          </div>
          {value.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {value.map(v => (
                <span key={v} className="text-[11px] px-2 py-0.5 rounded-full bg-[#151921] text-neutral-200">{v}</span>
              ))}
            </div>
          )}
        </div>, document.body)
      }
    </div>
  );
}


