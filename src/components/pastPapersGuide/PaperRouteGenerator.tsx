"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/ga/trackEvent";
import { APP_ROUTES } from "@/lib/seo/config";
import { QUESTION_BANK_TOTAL_COUNT } from "@/config/questionBankMarketing";
import { GUIDE_MODULES, type GuideModuleId } from "@/content/pastPapersGuide";
import {
  buildPaperRoute,
  modulesToParam,
  parseModulesParam,
  routeToPlainText,
  type RouteNode,
} from "@/lib/pastPapersGuide/recommendations";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function toggleModule(
  current: readonly GuideModuleId[],
  id: GuideModuleId,
): GuideModuleId[] {
  if (current.includes(id)) {
    return current.filter((module) => module !== id);
  }
  return [...current, id];
}

function RouteNodeCard({
  node,
  expanded,
}: {
  node: RouteNode;
  expanded: boolean;
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border px-5 py-4 transition-all duration-300 motion-reduce:transition-none",
        node.status === "skipped"
          ? "border-red-500/30 bg-red-500/5 opacity-75"
          : node.status === "partial"
            ? "border-[#C9A227]/40 bg-[#C9A227]/5"
            : "border-white/10 bg-white/[0.03]",
        expanded ? "shadow-sm" : "",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-widest text-[#64748B]">
            Step {node.step}
          </p>
          <h3
            className={cn(
              "mt-1 font-display text-lg font-bold text-white",
              node.status === "skipped" && "line-through decoration-red-400/70",
            )}
          >
            {node.title}
          </h3>
        </div>
        {node.status === "skipped" ? (
          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-300">
            Skip
          </span>
        ) : node.status === "partial" ? (
          <span className="rounded-full bg-[#C9A227]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#E8D5A3]">
            Unique only
          </span>
        ) : (
          <span className="rounded-full bg-[#3B82F6]/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#93C5FD]">
            Do
          </span>
        )}
      </div>
      {(expanded || node.status === "skipped" || node.status === "partial") && (
        <div className="mt-3 space-y-2">
          {node.skipReason ? (
            <p
              className={cn(
                "text-sm font-medium",
                node.status === "skipped" ? "text-red-300" : "text-[#E8D5A3]",
              )}
            >
              {node.skipReason}
            </p>
          ) : null}
          <p className="text-sm leading-relaxed text-[#94A3B8]">{node.body}</p>
          {node.detail ? (
            <p className="rounded-xl bg-black/20 px-3 py-2 font-mono text-xs leading-relaxed text-[#CBD5E1]">
              {node.detail}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}

function PaperRouteGeneratorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reducedMotion = useReducedMotion();
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModuleTip, setShowModuleTip] = useState(true);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());

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

  const onReset = () => {
    setShowModuleTip(false);
    updateQuery(["maths1", "maths2", "physics"]);
  };

  const onCopy = async () => {
    const text = routeToPlainText(route);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Plan copied");
      trackEvent("past_paper_plan_copied", { surface: "past_papers_guide" });
    } catch {
      setCopyStatus("Could not copy");
    }
    window.setTimeout(() => setCopyStatus(null), 2500);
  };

  useEffect(() => {
    if (reducedMotion) {
      setExpandedId(route[0]?.id ?? null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setExpandedId(entry.target.id.replace("route-", ""));
          }
        });
      },
      { rootMargin: "-45% 0px -35% 0px", threshold: 0.2 },
    );

    route.forEach((node) => {
      const el = nodeRefs.current.get(node.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [route, reducedMotion]);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold text-white">
              Which modules are you taking?
            </p>
            <div className="relative mt-3 inline-block max-w-full">
              {showModuleTip ? (
                <div
                  role="status"
                  className="absolute -top-14 left-0 z-10 max-w-[16rem] rounded-2xl bg-[#161D2F] px-3 py-2 text-xs leading-snug text-[#CBD5E1] shadow-lg"
                >
                  Change these to match your course. Defaults are Maths 1,
                  Maths 2 and Physics.
                  <span
                    aria-hidden
                    className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 bg-[#161D2F]"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {GUIDE_MODULES.map((module) => {
                  const active = modules.includes(module.id);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onModuleToggle(module.id)}
                      className={cn(
                        "min-h-11 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]",
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

          <p className="text-sm leading-relaxed text-[#94A3B8]">
            This order matches the in-app{" "}
            <Link
              href={APP_ROUTES.pastPaperRoadmap}
              className="text-white underline decoration-white/25 underline-offset-4 hover:decoration-[#3B82F6]"
            >
              past papers roadmap
            </Link>
            . Skip and Unique only labels assume you work through the steps in
            this sequence from the start.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCopy}
              className="min-h-11 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0A0F1D] transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            >
              Copy plan
            </button>
            <button
              type="button"
              onClick={onReset}
              className="min-h-11 rounded-xl bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B82F6]"
            >
              Reset
            </button>
            <p role="status" className="self-center text-sm text-[#94A3B8]">
              {copyStatus}
            </p>
          </div>
        </div>

        <div className="space-y-3" aria-live="polite" aria-relevant="additions">
          {route.map((node) => (
            <div
              key={node.id}
              id={`route-${node.id}`}
              ref={(el) => {
                if (el) nodeRefs.current.set(node.id, el);
              }}
            >
              <RouteNodeCard
                node={node}
                expanded={reducedMotion || expandedId === node.id}
              />
            </div>
          ))}
        </div>
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
