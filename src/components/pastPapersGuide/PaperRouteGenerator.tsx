"use client";

import {
  Suspense,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import { APP_ROUTES } from "@/lib/seo/config";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import {
  GUIDE_MODULES,
  MAX_GUIDE_MODULES,
  type GuideModuleId,
} from "@/content/pastPapersGuide";
import {
  buildPaperRoute,
  modulesToParam,
  parseModulesParam,
  type RouteNode,
} from "@/lib/pastPapersGuide/recommendations";
import { ROADMAP_EXPAND_TRANSITION_CLASS } from "@/components/papers/roadmap/roadmapTimelineLayout";

const SPINE_WIDTH = 72;
const SPINE_CENTER_X = SPINE_WIDTH / 2;
const WAVE_AMPLITUDE = 12;
const WAVE_FREQUENCY = 0.012;

function getNodeX(y: number): number {
  const offsetCorrection = WAVE_AMPLITUDE * 0.3;
  const sine = Math.sin(y * WAVE_FREQUENCY) * WAVE_AMPLITUDE;
  const cosine = Math.cos(y * WAVE_FREQUENCY * 0.7) * (WAVE_AMPLITUDE * 0.3);
  return SPINE_CENTER_X + sine + cosine - offsetCorrection;
}

function generateSpinePath(startY: number, endY: number): string {
  if (endY <= startY) return "";

  const points: { x: number; y: number }[] = [];
  const pathLength = endY - startY;
  const steps = Math.max(Math.floor(pathLength / 2), 16);

  for (let i = 0; i <= steps; i++) {
    const y = startY + (i / steps) * pathLength;
    points.push({ x: getNodeX(y), y });
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const next = points[i + 1];
    if (next) {
      path += ` Q ${curr.x} ${curr.y} ${(curr.x + next.x) / 2} ${(curr.y + next.y) / 2}`;
    } else {
      path += ` L ${curr.x} ${curr.y}`;
    }
  }
  return path;
}

function toggleModule(
  current: readonly GuideModuleId[],
  id: GuideModuleId,
): GuideModuleId[] {
  if (current.includes(id)) {
    const next = current.filter((module) => module !== id);
    return next.length ? next : [...current];
  }
  if (current.length >= MAX_GUIDE_MODULES) {
    return [...current];
  }
  return [...current, id];
}

/** Match question-bank session difficulty pills: solid fill + white label. */
function statusAccent(status: RouteNode["status"]) {
  if (status === "skipped") {
    return {
      node: "bg-[#EF4444]",
      badge: "bg-[#EF4444] text-white",
      label: "Skip" as const,
    };
  }
  if (status === "partial") {
    return {
      node: "bg-[#EAB308]",
      badge: "bg-[#EAB308] text-white",
      label: "Unique only" as const,
    };
  }
  return {
    node: "bg-[#3B82F6]",
    badge: null,
    label: null,
  };
}

function RouteStatusPill({ status }: { status: RouteNode["status"] }) {
  const accent = statusAccent(status);
  if (!accent.label || !accent.badge) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-bold",
        accent.badge,
      )}
    >
      {accent.label}
    </span>
  );
}

function RouteCard({
  node,
  expanded,
  onToggle,
  cardRef,
}: {
  node: RouteNode;
  expanded: boolean;
  onToggle: () => void;
  cardRef: (el: HTMLElement | null) => void;
}) {
  return (
    <article ref={cardRef} className="min-w-0 pb-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "w-full rounded-2xl bg-white/[0.035] px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] sm:px-5",
          expanded ? "bg-white/[0.06]" : "hover:bg-white/[0.05]",
          node.status === "skipped" && "opacity-80",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "font-display text-lg font-bold text-white sm:text-xl",
                  node.status === "skipped" &&
                    "line-through decoration-red-400/70",
                )}
              >
                {node.step}. {node.title}
              </h3>
              <RouteStatusPill status={node.status} />
            </div>
          </div>
          <ChevronDown
            aria-hidden
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-[#94A3B8] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              expanded && "rotate-180 text-[#3B82F6]",
            )}
          />
        </div>

        <div
          className={cn(
            "grid motion-reduce:transition-none",
            ROADMAP_EXPAND_TRANSITION_CLASS,
            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={cn(
                "mt-4 space-y-3 border-t border-white/10 pt-4 transition-opacity",
                ROADMAP_EXPAND_TRANSITION_CLASS,
                expanded ? "opacity-100" : "opacity-0",
              )}
            >
              {node.skipReason ? (
                <p
                  className={cn(
                    "text-sm font-medium",
                    node.status === "skipped"
                      ? "text-red-300"
                      : "text-[#E8D5A3]",
                  )}
                >
                  {node.skipReason}
                </p>
              ) : null}
              <p className="text-sm leading-relaxed text-[#94A3B8]">
                {node.body}
              </p>
              {node.linkHref && node.linkLabel ? (
                <a
                  href={node.linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex text-sm font-semibold text-white underline decoration-white/25 underline-offset-4 hover:decoration-[#3B82F6]"
                >
                  {node.linkLabel}
                </a>
              ) : null}
              {node.detail ? (
                <p className="rounded-xl bg-black/20 px-3 py-2 font-mono text-xs leading-relaxed text-[#CBD5E1]">
                  {node.detail}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}

function RouteEndCard({ cardRef }: { cardRef: (el: HTMLElement | null) => void }) {
  return (
    <article ref={cardRef} className="min-w-0 pb-1">
      <Link
        href={APP_ROUTES.questionBank}
        className="block w-full rounded-2xl bg-white/[0.04] px-4 py-4 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] sm:px-5 sm:py-5"
      >
        <p className="font-display text-lg font-bold text-white sm:text-xl">
          Run out of questions?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          Check out our {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ written
          questions in the ESAT CAMP question bank.
        </p>
      </Link>
    </article>
  );
}

function CurvyRouteTimeline({
  route,
  expandedId,
  onToggle,
}: {
  route: readonly RouteNode[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [trackHeight, setTrackHeight] = useState(0);

  const itemCount = route.length + 1;

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const trackTop = track.getBoundingClientRect().top;
    const next = cardRefs.current.slice(0, itemCount).map((el) => {
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return rect.top - trackTop + rect.height / 2;
    });
    setCenters(next);
    setTrackHeight(track.scrollHeight);
  }, [itemCount]);

  useLayoutEffect(() => {
    measure();
  }, [measure, route, expandedId]);

  useEffect(() => {
    const timer = window.setTimeout(measure, 430);
    return () => window.clearTimeout(timer);
  }, [expandedId, measure]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(track);
    cardRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure, itemCount]);

  const endY =
    centers.length > 0
      ? Math.max(...centers, trackHeight - 8)
      : Math.max(trackHeight - 8, 0);
  const spinePath = generateSpinePath(0, endY);
  const expandedIndex =
    expandedId === null
      ? -1
      : route.findIndex((node) => node.id === expandedId);
  const progressY =
    expandedIndex >= 0 && centers[expandedIndex] !== undefined
      ? centers[expandedIndex]
      : centers[0] ?? 0;
  const progressPath =
    centers.length > 0 ? generateSpinePath(0, progressY) : "";

  return (
    <div ref={trackRef} className="relative flex gap-3 sm:gap-5">
      <div
        className="relative w-12 shrink-0 sm:w-[4.5rem]"
        style={{ minHeight: trackHeight || undefined }}
        aria-hidden
      >
        <svg
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 overflow-visible"
          width={SPINE_WIDTH}
          height={Math.max(endY, 1)}
          viewBox={`0 0 ${SPINE_WIDTH} ${Math.max(endY, 1)}`}
        >
          {spinePath ? (
            <path
              d={spinePath}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {progressPath ? (
            <path
              d={progressPath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-[d] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            />
          ) : null}
        </svg>

        {route.map((node, index) => {
          const y = centers[index];
          if (y === undefined) return null;
          const accent = statusAccent(node.status);
          const expanded = expandedId === node.id;
          return (
            <span
              key={node.id}
              className={cn(
                "absolute z-[1] h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-[#0A0F1D] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                accent.node,
                expanded && "scale-125",
              )}
              style={{ left: getNodeX(y), top: y }}
            />
          );
        })}

        {centers[route.length] !== undefined ? (
          <span
            className="absolute z-[1] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/[0.06] text-[#94A3B8] ring-4 ring-[#0A0F1D]"
            style={{
              left: getNodeX(centers[route.length]),
              top: centers[route.length],
            }}
            title="End of roadmap"
          >
            <Flag className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        {route.map((node, index) => (
          <RouteCard
            key={node.id}
            node={node}
            expanded={expandedId === node.id}
            onToggle={() => onToggle(node.id)}
            cardRef={(el) => {
              cardRefs.current[index] = el;
            }}
          />
        ))}
        <RouteEndCard
          cardRef={(el) => {
            cardRefs.current[route.length] = el;
          }}
        />
      </div>
    </div>
  );
}

function PaperRouteGeneratorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModuleTip, setShowModuleTip] = useState(true);
  const [modules, setModules] = useState<GuideModuleId[]>(() =>
    parseModulesParam(searchParams.get("modules")),
  );
  const deferredModules = useDeferredValue(modules);
  const route = useMemo(
    () => buildPaperRoute({ modules: deferredModules }),
    [deferredModules],
  );
  const syncingRef = useRef(false);

  // Keep the shareable URL in sync without blocking pill clicks.
  useEffect(() => {
    const nextParam = modulesToParam(modules);
    if (searchParams.get("modules") === nextParam) return;

    syncingRef.current = true;
    const params = new URLSearchParams(searchParams.toString());
    params.set("modules", nextParam);
    params.delete("progress");
    startTransition(() => {
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  }, [modules, router, searchParams]);

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    const fromUrl = parseModulesParam(searchParams.get("modules"));
    setModules((current) =>
      current.join() === fromUrl.join() ? current : fromUrl,
    );
  }, [searchParams]);

  const onModuleToggle = (id: GuideModuleId) => {
    setShowModuleTip(false);
    setModules((current) => {
      const next = toggleModule(current, id);
      if (next.join() === current.join()) return current;
      queueMicrotask(() => {
        trackEvent("past_paper_plan_module_changed", {
          module: id,
          selected: next.includes(id),
          surface: "past_papers_guide",
        });
      });
      return next;
    });
    setExpandedId(null);
  };

  return (
    <div className="space-y-8">
      <div className="w-full">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p className="text-sm font-semibold text-white">
            Which modules are you taking?
          </p>
          <p className="text-xs text-[#64748B]">
            Up to {MAX_GUIDE_MODULES} subjects
          </p>
        </div>
        <div className="relative mt-3 w-full">
          {showModuleTip ? (
            <div
              role="status"
              className="absolute -top-14 left-0 z-10 max-w-[16rem] rounded-2xl bg-[#161D2F] px-3 py-2 text-xs leading-snug text-[#CBD5E1] shadow-lg"
            >
              Defaults are Maths 1, Maths 2 and Physics. Pick up to three.
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-[#161D2F]"
              />
            </div>
          ) : null}
          <div className="grid w-full grid-cols-5 gap-1.5 sm:gap-2">
            {GUIDE_MODULES.map((module) => {
              const active = modules.includes(module.id);
              const atCap = modules.length >= MAX_GUIDE_MODULES && !active;
              return (
                <button
                  key={module.id}
                  type="button"
                  aria-pressed={active}
                  aria-disabled={atCap}
                  title={
                    atCap
                      ? `Maximum ${MAX_GUIDE_MODULES} subjects`
                      : module.label
                  }
                  onClick={() => {
                    if (atCap) return;
                    onModuleToggle(module.id);
                  }}
                  className={cn(
                    "min-h-10 w-full rounded-full px-1 py-2 text-center text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6] sm:min-h-11 sm:px-2 sm:text-sm",
                    active
                      ? "bg-[#3B82F6] text-white"
                      : atCap
                        ? "cursor-not-allowed bg-white/[0.03] text-[#475569]"
                        : "bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white",
                  )}
                >
                  {module.shortLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "w-full transition-opacity",
          modules !== deferredModules && "opacity-70",
        )}
        aria-live="polite"
      >
        <CurvyRouteTimeline
          route={route}
          expandedId={expandedId}
          onToggle={(id) =>
            setExpandedId((current) => (current === id ? null : id))
          }
        />
      </div>

      <p className="text-sm leading-relaxed text-[#94A3B8]">
        You do not need to finish everything on this page. Quality of review
        matters more than the number of papers completed.
      </p>
    </div>
  );
}

export function PaperRouteGenerator() {
  return (
    <Suspense fallback={<p className="text-sm text-[#94A3B8]">Loading plan…</p>}>
      <PaperRouteGeneratorInner />
    </Suspense>
  );
}
