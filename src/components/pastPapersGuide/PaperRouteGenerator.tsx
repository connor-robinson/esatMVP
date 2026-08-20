"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import { APP_ROUTES } from "@/lib/seo/config";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { GUIDE_MODULES, type GuideModuleId } from "@/content/pastPapersGuide";
import {
  buildPaperRoute,
  modulesToParam,
  parseModulesParam,
  type RouteNode,
} from "@/lib/pastPapersGuide/recommendations";
import { ROADMAP_EXPAND_TRANSITION_CLASS } from "@/components/papers/roadmap/roadmapTimelineLayout";

function toggleModule(
  current: readonly GuideModuleId[],
  id: GuideModuleId,
): GuideModuleId[] {
  if (current.includes(id)) {
    return current.filter((module) => module !== id);
  }
  return [...current, id];
}

function statusAccent(status: RouteNode["status"]) {
  if (status === "skipped") {
    return {
      node: "bg-red-400/80 ring-red-400/30",
      badge: "bg-red-500/15 text-red-300",
      label: "Skip",
      bar: "bg-red-400/50",
    };
  }
  if (status === "partial") {
    return {
      node: "bg-[#C9A227] ring-[#C9A227]/30",
      badge: "bg-[#C9A227]/15 text-[#E8D5A3]",
      label: "Unique only",
      bar: "bg-[#C9A227]/60",
    };
  }
  return {
    node: "bg-[#3B82F6] ring-[#3B82F6]/30",
    badge: "bg-[#3B82F6]/15 text-[#93C5FD]",
    label: "Do",
    bar: "bg-[#3B82F6]/50",
  };
}

function RouteTimelineCard({
  node,
  expanded,
  isLast,
  onToggle,
}: {
  node: RouteNode;
  expanded: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  const accent = statusAccent(node.status);

  return (
    <div className="relative flex gap-4 sm:gap-5">
      <div className="relative flex w-10 shrink-0 flex-col items-center sm:w-12">
        <span
          className={cn(
            "z-[1] mt-5 h-3.5 w-3.5 rounded-full ring-4 ring-[#0A0F1D] transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            accent.node,
            expanded && "scale-125",
          )}
          aria-hidden
        />
        {!isLast ? (
          <span
            aria-hidden
            className={cn(
              "absolute top-9 bottom-0 w-[3px] rounded-full bg-white/10",
              expanded && accent.bar,
            )}
          />
        ) : null}
      </div>

      <article className="min-w-0 flex-1 pb-4">
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
                <span className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
                  Step {node.step}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    accent.badge,
                  )}
                >
                  {accent.label}
                </span>
              </div>
              <h3
                className={cn(
                  "mt-1.5 font-display text-lg font-bold text-white sm:text-xl",
                  node.status === "skipped" &&
                    "line-through decoration-red-400/70",
                )}
              >
                {node.title}
              </h3>
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
                  "space-y-3 border-t border-white/10 pt-4 mt-4 transition-opacity",
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
    </div>
  );
}

function PaperRouteGeneratorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModuleTip, setShowModuleTip] = useState(true);

  const modules = useMemo(
    () => parseModulesParam(searchParams.get("modules")),
    [searchParams],
  );

  const route = useMemo(() => buildPaperRoute({ modules }), [modules]);

  const updateQuery = useCallback(
    (nextModules: GuideModuleId[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("modules", modulesToParam(nextModules));
      params.delete("progress");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const onModuleToggle = (id: GuideModuleId) => {
    setShowModuleTip(false);
    const next = toggleModule(modules, id);
    updateQuery(next.length ? next : [...modules]);
    trackEvent("past_paper_plan_module_changed", {
      module: id,
      selected: next.includes(id),
      surface: "past_papers_guide",
    });
  };

  return (
    <div className="space-y-8">
      <div className="w-full">
        <p className="text-sm font-semibold text-white">
          Which modules are you taking?
        </p>
        <div className="relative mt-3 w-full">
          {showModuleTip ? (
            <div
              role="status"
              className="absolute -top-14 left-0 z-10 max-w-[16rem] rounded-2xl bg-[#161D2F] px-3 py-2 text-xs leading-snug text-[#CBD5E1] shadow-lg"
            >
              Change these to match your course. Defaults are Maths 1, Maths 2
              and Physics.
              <span
                aria-hidden
                className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-[#161D2F]"
              />
            </div>
          ) : null}
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {GUIDE_MODULES.map((module) => {
              const active = modules.includes(module.id);
              return (
                <button
                  key={module.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onModuleToggle(module.id)}
                  className={cn(
                    "min-h-11 w-full rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
                    active
                      ? "bg-[#3B82F6] text-white"
                      : "bg-white/5 text-[#94A3B8] hover:bg-white/10 hover:text-white",
                  )}
                >
                  {module.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full" aria-live="polite">
        {route.map((node, index) => (
          <RouteTimelineCard
            key={node.id}
            node={node}
            isLast={index === route.length - 1}
            expanded={expandedId === node.id}
            onToggle={() =>
              setExpandedId((current) => (current === node.id ? null : node.id))
            }
          />
        ))}
      </div>

      <p className="text-sm leading-relaxed text-[#94A3B8]">
        You do not need to finish everything on this page. Quality of review
        matters more than the number of papers completed.
      </p>

      <div className="rounded-2xl bg-white/[0.04] p-5 sm:p-6">
        <p className="font-display text-xl font-bold text-white">
          Run out of questions?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#94A3B8]">
          Check out our{" "}
          <Link
            href={APP_ROUTES.questionBank}
            className="font-semibold text-white underline decoration-white/25 underline-offset-4 hover:decoration-[#3B82F6]"
          >
            {QUESTION_BANK_TOTAL_COUNT.toLocaleString()}+ written questions
          </Link>{" "}
          in the ESAT CAMP question bank.
        </p>
      </div>
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
