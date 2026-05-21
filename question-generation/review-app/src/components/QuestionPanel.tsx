"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { MathContent } from "./shared/MathContent";
import { StemContent } from "./shared/StemContent";
import { DiagramInsertToolbar } from "./DiagramInsertToolbar";
import { DiagramRegenPanel } from "./DiagramRegenPanel";
import { WalkthroughVideoPlayer } from "./WalkthroughVideoPlayer";
import { cn, coerceFieldText, hasDiagram } from "@/lib/utils";
import { Eye, Pencil, X, Plus, ChevronDown, ChevronUp, Video } from "lucide-react";
import { getQuestionTagText, formatTagDisplay, getPaperType, getTopicsForPaper, type TopicOption } from "@/lib/curriculum";
import type { ReviewQuestion } from "@/types/review";

function WalkthroughUploadBanner({
  questionId,
  initialCode,
}: {
  questionId: string;
  initialCode?: string | null;
}) {
  const [code, setCode] = useState<string | null>(() => {
    const c = initialCode?.trim();
    return c ? c.toUpperCase() : null;
  });
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const fromProp = initialCode?.trim() ? initialCode.trim().toUpperCase() : null;
    if (fromProp) {
      setCode(fromProp);
      setErr(null);
      return;
    }

    let cancel = false;
    (async () => {
      try {
        const r = await fetch("/api/review/ensure-media-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId }),
        });
        const j = (await r.json()) as { media_upload_code?: string; error?: string };
        if (!r.ok) {
          throw new Error(j.error || "Failed to get upload code");
        }
        if (!cancel) {
          setCode(j.media_upload_code ?? null);
          setErr(null);
        }
      } catch (e: unknown) {
        if (!cancel) {
          setErr(e instanceof Error ? e.message : String(e));
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [questionId, initialCode]);

  const uploaderUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/uploader`
      : "/uploader";

  if (err) {
    return (
      <div className="mx-4 mb-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
        Walkthrough upload: {err} Ensure{" "}
        <span className="font-mono">NEXT_PUBLIC_SUPABASE_URL</span> and{" "}
        <span className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> are set on
        Vercel. If you do not use the service role key, run{" "}
        <span className="font-mono">review_walkthrough_rls.sql</span> in Supabase.
      </div>
    );
  }
  if (!code) {
    return (
      <div className="mx-4 mb-2 text-xs text-white/40">Loading walkthrough code…</div>
    );
  }
  return (
    <div className="mx-4 my-3 rounded-xl border-2 border-amber-300/70 bg-amber-100/[0.07] p-4">
      <p className="text-xs font-semibold text-amber-100/90 uppercase tracking-wide mb-2">
        iPad walkthrough (screen + mic)
      </p>
      <p className="text-center text-4xl font-black tracking-[0.2em] text-white font-mono mb-3">
        {code}
      </p>
      <p className="text-xs text-white/50 mb-1">On iPad, open</p>
      <p className="text-sm font-mono text-sky-300 break-all">{uploaderUrl}</p>
      <p className="text-xs text-white/40 mt-2">
        Enter the code above, then upload your single video file.
      </p>
    </div>
  );
}

interface QuestionPanelProps {
  question: ReviewQuestion;
  editingField: string | null;
  onQuestionStemChange: (value: string) => void;
  onOptionChange: (letter: string, value: string) => void;
  onAddOption?: () => string | null;
  onRemoveOption?: (letter: string) => void;
  onDistractorChange?: (letter: string, value: string) => void;
  onReorderOption?: (letter: string, direction: "up" | "down") => void;
  onCorrectOptionChange?: (letter: string) => void;
  onAnswerShown?: () => void;
  onDifficultyChange?: (value: 'Easy' | 'Medium' | 'Hard' | 'Extreme') => void;
  onPaperChange?: (value: string | null) => void;
  onPrimaryTagChange?: (value: string | null) => void;
  onAddSecondaryTag?: (tag: string) => void;
  onRemoveSecondaryTag?: (tag: string) => void;
  onStartEditingField?: (fieldName: string) => void;
  onStopEditingField?: () => void;
  /** Legacy: pre-diagram stem snapshot resolver. Side-by-side UI was removed,
   * but the callback is preserved so power users can still revert via dev tools. */
  onResolveAutoDiagramStem?: (choice: "keep_diagram" | "revert") => void | Promise<void>;
  /** Queue a background diagram-regeneration job. Resolves once the job is enqueued. */
  onRequestDiagramRegen?: (userNote: string) => Promise<ReviewQuestion | null>;
  /** Poll for regen status updates. Panel calls this on a timer while pending. */
  onRefreshDiagramRegenStatus?: () => Promise<void>;
}

export function QuestionPanel({
  question,
  editingField,
  onQuestionStemChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onDistractorChange,
  onReorderOption,
  onCorrectOptionChange,
  onAnswerShown,
  onDifficultyChange,
  onPaperChange,
  onPrimaryTagChange,
  onAddSecondaryTag,
  onRemoveSecondaryTag,
  onStartEditingField,
  onStopEditingField,
  onResolveAutoDiagramStem,
  onRequestDiagramRegen,
  onRefreshDiagramRegenStatus,
}: QuestionPanelProps) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [editingPill, setEditingPill] = useState<string | null>(null);
  const [emptySecondaryTags, setEmptySecondaryTags] = useState<string[]>([]);
  const pillDropdownRefs = useRef<{ [key: string]: HTMLSelectElement | null }>({});
  const questionStemRef = useRef<HTMLTextAreaElement>(null);
  
  const options = question.options || {};
  const optionLetters = Object.keys(options).sort();
  const secondaryTags = question.secondary_tags || [];
  /** Side-by-side ``Before / Current`` compare was removed; the stem already
   * has the diagram inline. Kept for downstream callers that still pass the
   * resolver prop. */
  void onResolveAutoDiagramStem;
  const paperType = getPaperType(question);
  const availablePapers = ['Math 1', 'Math 2', 'Physics', 'Chemistry', 'Biology', 'Paper 1', 'Paper 2'];
  
  const availableTopics = useMemo(() => {
    return getTopicsForPaper(paperType, question.subjects);
  }, [paperType, question.subjects]);

  const ideaStimulusType = useMemo(() => {
    const plan = question.idea_plan;
    if (!plan || typeof plan !== "object") return null;
    const raw = (plan as Record<string, unknown>).stimulus_type;
    if (typeof raw !== "string") return null;
    const t = raw.trim().toLowerCase();
    return t.length ? t : null;
  }, [question.idea_plan]);

  const stemHasTable = useMemo(() => {
    const stem = String(question.question_stem || "");
    if (!stem.trim()) return false;
    if (/<table\b/i.test(stem)) return true;
    const lines = stem.split("\n");
    for (let i = 0; i + 1 < lines.length; i += 1) {
      const row = lines[i];
      const sep = lines[i + 1];
      if (!row.includes("|") || !sep.includes("|")) continue;
      const sepCells = sep.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
      const looksLikeSep = sepCells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
      if (looksLikeSep) return true;
    }
    return false;
  }, [question.question_stem]);

  const showMissingTableWarning = ideaStimulusType === "table" && !stemHasTable;

  const getSubjectColor = (subjects: string | null): string => {
    if (!subjects) return 'bg-white/10 text-white/70';
    const subjectsLower = subjects.toLowerCase().trim();
    if (subjectsLower === 'math 1' || subjectsLower === 'math1') {
      return 'bg-[#406166]/20 text-[#5da8f0]';
    }
    if (subjectsLower === 'math 2' || subjectsLower === 'math2') {
      return 'bg-[#406166]/20 text-[#5da8f0]';
    }
    if (subjectsLower === 'physics') {
      return 'bg-[#2f2835]/30 text-[#a78bfa]';
    }
    if (subjectsLower === 'chemistry') {
      return 'bg-[#854952]/20 text-[#ef7d7d]';
    }
    if (subjectsLower === 'biology') {
      return 'bg-[#506141]/20 text-[#85BC82]';
    }
    if (subjectsLower === 'paper 1' || subjectsLower === 'paper1') {
      return 'bg-[#406166]/20 text-[#5da8f0]';
    }
    if (subjectsLower === 'paper 2' || subjectsLower === 'paper2') {
      return 'bg-[#406166]/20 text-[#5da8f0]';
    }
    return 'bg-white/10 text-white/70';
  };

  const getTagDisplay = (tag: string | null): string => {
    if (!tag) return '';
    const text = getQuestionTagText(question, tag);
    return formatTagDisplay(tag, text, question);
  };

  const findTopicOption = (tagCode: string | null): TopicOption | null => {
    if (!tagCode) return null;
    if (paperType === 'ESAT' && tagCode.includes('-')) {
      return availableTopics.find(t => t.fullCode === tagCode) || null;
    }
    if (paperType === 'TMUA') {
      return availableTopics.find(t => t.code === tagCode) || null;
    }
    return availableTopics.find(t => t.fullCode === tagCode || t.code === tagCode) || null;
  };

  const getStorageCode = (option: TopicOption | null): string | null => {
    if (!option) return null;
    return paperType === 'ESAT' ? option.fullCode : option.code;
  };

  const handleRemoveSecondaryTag = (tag: string) => {
    if (window.confirm("Are you sure you want to remove this secondary tag?")) {
      onRemoveSecondaryTag?.(tag);
    }
  };

  if (!question || !question.id) {
    return (
      <div className="flex min-h-[200px] items-center justify-center bg-white/[0.02] rounded-organic-lg border border-white/10 py-16">
        <div className="text-white/60 font-mono">Invalid question data</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-white/[0.02] rounded-organic-lg border border-white/10">
      {/* Header with editable pills */}
      <div className="flex flex-wrap items-center gap-2 p-4 border-b border-white/10 flex-shrink-0">
        {/* ESAT/TMUA Label - not editable */}
        {paperType && (
          <span className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-white/10 text-white/70">
            {paperType}
          </span>
        )}

        {question.screen_video_storage_path?.trim() ? (
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-organic-md text-xs font-mono bg-emerald-500/20 text-emerald-200 border border-emerald-400/45"
            title="Walkthrough video is linked to this question"
          >
            <Video className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
            Video attached
          </span>
        ) : null}
        
        {/* Difficulty - Editable Pill */}
        {editingPill === 'difficulty' ? (
          <select
            value={question.difficulty}
            onChange={(e) => {
              onDifficultyChange?.(e.target.value as 'Easy' | 'Medium' | 'Hard' | 'Extreme');
              setEditingPill(null);
            }}
            onBlur={() => setEditingPill(null)}
            autoFocus
            className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-[#0f1114] text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50",
              question.difficulty === 'Easy' && 'bg-[#506141]/20 text-[#85BC82]',
              question.difficulty === 'Medium' && 'bg-[#967139]/20 text-[#b8a066]',
              question.difficulty === 'Hard' && 'bg-[#854952]/20 text-[#ef7d7d]',
              question.difficulty === 'Extreme' &&
                'bg-purple-600/30 text-purple-200 border border-purple-400/35 ring-1 ring-purple-400/20'
            )}
            style={{
              backgroundColor: question.difficulty === 'Easy' ? 'rgba(80, 97, 65, 0.2)' :
                              question.difficulty === 'Medium' ? 'rgba(150, 113, 57, 0.2)' :
                              question.difficulty === 'Hard' ? 'rgba(133, 73, 82, 0.2)' :
                              question.difficulty === 'Extreme' ? 'rgba(147, 51, 234, 0.28)' :
                              '#0f1114'
            }}
          >
            <option value="Easy" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>Easy</option>
            <option value="Medium" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>Medium</option>
            <option value="Hard" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>Hard</option>
            <option value="Extreme" style={{ backgroundColor: '#2e1064', color: '#e9d5ff' }}>Extreme</option>
          </select>
        ) : (
          <button
            onClick={() => setEditingPill('difficulty')}
            className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity",
              question.difficulty === 'Easy' && 'bg-[#506141]/20 text-[#85BC82]',
              question.difficulty === 'Medium' && 'bg-[#967139]/20 text-[#b8a066]',
              question.difficulty === 'Hard' && 'bg-[#854952]/20 text-[#ef7d7d]',
              question.difficulty === 'Extreme' &&
                'bg-purple-600/30 text-purple-200 border border-purple-400/35 ring-1 ring-purple-400/20'
            )}
          >
            {question.difficulty}
          </button>
        )}

        {/* Subjects - Editable Pill */}
        {editingPill === 'subjects' ? (
          <select
            value={question.subjects || ''}
            onChange={(e) => {
              onPaperChange?.(e.target.value || null);
              setEditingPill(null);
            }}
            onBlur={() => setEditingPill(null)}
            autoFocus
            className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-[#0f1114] text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50",
              getSubjectColor(question.subjects)
            )}
            style={{ backgroundColor: '#0f1114' }}
          >
            <option value="" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>No Subject</option>
            {availablePapers.map(paper => (
              <option key={paper} value={paper} style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>{paper}</option>
            ))}
          </select>
        ) : (
          question.subjects && question.subjects.trim() && (
            <button
              onClick={() => setEditingPill('subjects')}
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono cursor-pointer hover:opacity-80 transition-opacity",
                getSubjectColor(question.subjects)
              )}
            >
              {question.subjects}
            </button>
          )
        )}

        {/* Primary Tag - Editable Pill */}
        {editingPill === 'primary_tag' ? (
          <select
            value={question.primary_tag || ''}
            onChange={(e) => {
              onPrimaryTagChange?.(e.target.value || null);
              setEditingPill(null);
            }}
            onBlur={() => setEditingPill(null)}
            autoFocus
            className={cn(
              "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-[#0f1114] text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]",
              getSubjectColor(question.subjects)
            )}
            style={{ backgroundColor: '#0f1114' }}
          >
            <option value="" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>Select topic</option>
            {availableTopics.map(topic => {
              const storageCode = getStorageCode(topic);
              return (
                <option key={storageCode} value={storageCode || ''} style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>
                  {topic.title}
                </option>
              );
            })}
          </select>
        ) : (
          question.primary_tag && (
            <button
              onClick={() => setEditingPill('primary_tag')}
              className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-white/20 text-white/90 cursor-pointer hover:opacity-80 transition-opacity"
            >
              {getTagDisplay(question.primary_tag) || question.primary_tag}
            </button>
          )
        )}

        {/* Secondary Tags */}
        {secondaryTags.map((tag, index) => (
          <div key={`tag-${index}`} className="flex items-center gap-1">
            {editingPill === `secondary_${index}` ? (
              <select
                value={tag || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  if (onRemoveSecondaryTag && onAddSecondaryTag) {
                    onRemoveSecondaryTag(tag);
                    if (newValue) {
                      onAddSecondaryTag(newValue);
                    }
                  }
                  setEditingPill(null);
                }}
                onBlur={() => setEditingPill(null)}
                autoFocus
                className={cn(
                  "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-[#0f1114] text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]",
                  getSubjectColor(question.subjects)
                )}
                style={{ backgroundColor: '#0f1114' }}
              >
                <option value="" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>Select topic</option>
                {availableTopics.map(topic => {
                  const storageCode = getStorageCode(topic);
                  return (
                    <option key={storageCode} value={storageCode || ''}>
                      {topic.title}
                    </option>
                  );
                })}
              </select>
            ) : (
              <>
                <button
                  onClick={() => setEditingPill(`secondary_${index}`)}
                  className="px-3 py-1.5 rounded-organic-md text-xs font-mono bg-white/5 text-white/60 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {getTagDisplay(tag) || tag}
                </button>
                <button
                  onClick={() => handleRemoveSecondaryTag(tag)}
                  className="p-1 rounded-organic-md bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors border border-white/20"
                  title="Remove tag"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Add Secondary Tag Button */}
        {onAddSecondaryTag && (
          <button
            onClick={() => {
              const newId = `empty-${Date.now()}-${Math.random()}`;
              setEmptySecondaryTags(prev => [...prev, newId]);
            }}
            className="p-1.5 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-colors border border-white/20 flex items-center justify-center"
            title="Add secondary tag"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}

        {/* Empty placeholder dropdowns */}
        {emptySecondaryTags.map((placeholderId, index) => (
          <div key={`empty-${placeholderId}`} className="flex items-center gap-1">
            <select
              value=""
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue && onAddSecondaryTag) {
                  onAddSecondaryTag(newValue);
                  setEmptySecondaryTags(prev => prev.filter(id => id !== placeholderId));
                }
              }}
              onBlur={() => {
                setEmptySecondaryTags(prev => prev.filter(id => id !== placeholderId));
              }}
              autoFocus
              className={cn(
                "px-3 py-1.5 rounded-organic-md text-xs font-mono border border-white/20 bg-[#0f1114] text-white/90 focus:outline-none focus:ring-2 focus:ring-primary/50 min-w-[120px]",
                getSubjectColor(question.subjects)
              )}
              style={{ backgroundColor: '#0f1114' }}
            >
              <option value="" style={{ backgroundColor: '#0f1114', color: 'rgba(255, 255, 255, 0.9)' }}>Select topic</option>
              {availableTopics.map(topic => {
                const storageCode = getStorageCode(topic);
                return (
                  <option key={storageCode} value={storageCode || ''}>
                    {topic.title}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => {
                setEmptySecondaryTags(prev => prev.filter(id => id !== placeholderId));
              }}
              className="p-1 rounded-organic-md bg-white/5 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors border border-white/20"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <WalkthroughUploadBanner
        questionId={question.id}
        initialCode={question.media_upload_code ?? null}
      />
      <WalkthroughVideoPlayer
        questionId={question.id}
        storagePath={question.screen_video_storage_path}
      />

      {question.quality_gate_diagram_backfill_kind ? (
        <div className="mx-4 mb-2 rounded-lg border border-violet-400/40 bg-violet-500/[0.12] px-3 py-2.5 text-xs text-violet-50/95">
          <div className="font-mono font-semibold text-violet-100 mb-1">
            Backgenerated diagram — human review required
          </div>
          <p className="text-white/80 leading-relaxed">
            Quality Gate auto-inserted a{" "}
            {question.quality_gate_diagram_backfill_kind === "image"
              ? "generated image (Imagen)"
              : "generated inline SVG"}{" "}
            into this stem. Check that the figure matches the setup, does not spoil the answer,
            and that labels and layout are exam-appropriate.
          </p>
          {question.quality_gate_diagram_backfill_at ? (
            <p className="mt-1.5 text-[10px] font-mono text-white/45">
              Backfill applied: {question.quality_gate_diagram_backfill_at}
            </p>
          ) : null}
        </div>
      ) : null}

      {(question.quality_gate_assessed_at ||
        question.quality_gate_verdict ||
        question.quality_gate_reason) && (
        <div className="mx-4 mb-2 rounded-lg border border-violet-400/25 bg-violet-500/[0.07] px-3 py-2 text-xs text-white/85">
          <div className="font-mono text-violet-200/95 mb-1.5">Question checker (AI)</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/65 font-mono mb-2">
            {question.quality_gate_verdict ? (
              <span>
                Verdict:{" "}
                <span className="text-violet-100/95">{question.quality_gate_verdict}</span>
              </span>
            ) : null}
            {question.quality_gate_action ? (
              <span>
                Action:{" "}
                <span className="text-violet-100/95">{question.quality_gate_action}</span>
              </span>
            ) : null}
            {question.quality_gate_model ? (
              <span title="Model used for scoring">
                Model: <span className="text-white/80">{question.quality_gate_model}</span>
              </span>
            ) : null}
            {question.quality_gate_job_id ? (
              <span title="Run id from the checker job">
                Run:{" "}
                <span className="text-white/70 break-all">{question.quality_gate_job_id}</span>
              </span>
            ) : null}
            {question.quality_gate_assessed_at ? (
              <span title="When the AI last scored this row">
                At:{" "}
                <span className="text-white/55">{question.quality_gate_assessed_at}</span>
              </span>
            ) : null}
          </div>
          {question.quality_gate_reason ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wide text-white/45">What the model said</div>
              <pre className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md bg-black/35 p-2 text-[11px] leading-relaxed text-white/80 border border-white/10">
                {question.quality_gate_reason}
              </pre>
            </div>
          ) : (
            <p className="text-white/45 text-[11px]">
              No reasoning text on this row (older run or DB column empty).
            </p>
          )}
        </div>
      )}

      {(question.quality_gate_calibration_tier === "gold" ||
        question.quality_gate_graph_candidate) && (
        <div className="mx-4 mb-2 space-y-2 rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-xs text-white/85">
          {question.quality_gate_calibration_tier === "gold" && (
            <div className="space-y-1">
              <div className="font-mono text-amber-200/95">
                Calibration: <span className="text-amber-100">gold</span> (elite pool)
              </div>
              {question.quality_gate_calibration_notes ? (
                <p className="text-white/75 leading-relaxed pl-0.5 border-l-2 border-amber-400/40 pl-2">
                  {question.quality_gate_calibration_notes}
                </p>
              ) : null}
            </div>
          )}
          {question.quality_gate_graph_candidate && (
            <div className="space-y-1">
              <div className="font-mono text-sky-200/95">
                Graph / diagram candidate — review stem, then add SVG. Suggested notes:
              </div>
              {question.quality_gate_graph_notes ? (
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md bg-black/30 p-2 text-[11px] leading-relaxed text-white/80 border border-white/10">
                  {question.quality_gate_graph_notes}
                </pre>
              ) : (
                <p className="text-white/45">No graph notes on row; open full row or re-run gate.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Question Stem */}
        <div className="space-y-2">
          {showMissingTableWarning ? (
            <div className="rounded-lg border border-amber-400/40 bg-amber-950/30 px-3 py-2">
              <p className="text-xs font-mono text-amber-100/90 leading-relaxed">
                Planner metadata says <code>stimulus_type: table</code>, but this stem has no
                table markup. If this item needs a data table, add it directly in the question
                stem (markdown table or HTML table).
              </p>
            </div>
          ) : null}
          {hasDiagram(question) ? (
            <DiagramRegenPanel
              question={question}
              onRequestRegen={onRequestDiagramRegen}
              onPollStatus={onRefreshDiagramRegenStatus}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
              Question
            </label>
            {onStartEditingField && (
              <button
                onClick={() => {
                  if (editingField === 'question_stem') {
                    onStopEditingField?.();
                  } else {
                    onStartEditingField('question_stem');
                  }
                }}
                className={cn(
                  "p-1 rounded-organic-md transition-colors",
                  editingField === 'question_stem'
                    ? "bg-primary/20 hover:bg-primary/30 text-primary"
                    : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                )}
                title={editingField === 'question_stem' ? "Stop editing" : "Edit question"}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editingField === 'question_stem' ? (
            <div className="space-y-2">
              <DiagramInsertToolbar
                stemRef={questionStemRef}
                stemValue={question.question_stem}
                onStemChange={onQuestionStemChange}
              />
              <textarea
                ref={questionStemRef}
                value={question.question_stem}
                onChange={(e) => onQuestionStemChange(e.target.value)}
                onBlur={() => onStopEditingField?.()}
                autoFocus
                className="w-full min-h-[120px] p-4 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-base resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.8' }}
              />
            </div>
          ) : (
            <div
              className="text-white/95 font-serif text-base leading-relaxed"
              style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: "1.8" }}
            >
              <StemContent content={question.question_stem} />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {/* Column Headers */}
          <div className="flex items-start gap-2">
            <div className="flex gap-2 shrink-0 items-start">
              {onReorderOption ? <div className="w-8" aria-hidden /> : null}
              <div className="w-11 flex justify-center">
                {showAnswer && onCorrectOptionChange ? (
                  <span className="text-[9px] font-mono text-white/35 uppercase text-center leading-tight pt-0.5">
                    OK
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex-1 flex items-start gap-3">
              <div className={showAnswer ? "flex-[0.2]" : "flex-1"}>
                <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
                  Options
                </label>
              </div>
              {showAnswer && (
                <div className="flex-[0.8]">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-mono text-white/60 uppercase tracking-wide">
                      Why this could be incorrect
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Options List */}
          {optionLetters.map((letter) => {
            const canRemove = optionLetters.length > 2 && letter !== question.correct_option;
            const isCorrect = letter === question.correct_option;
            const distractorRaw =
              question.distractor_map && typeof question.distractor_map === "object"
                ? question.distractor_map[letter]
                : null;
            const distractorText = coerceFieldText(distractorRaw, "");
            const isEditingOption = editingField === `option_${letter}`;
            const isEditingDistractor = editingField === `distractor_${letter}`;
            const optIdx = optionLetters.indexOf(letter);
            const canMoveUp = optIdx > 0;
            const canMoveDown = optIdx >= 0 && optIdx < optionLetters.length - 1;
            
            return (
              <div key={letter} className="space-y-2">
                <div className="flex items-start gap-2">
                  {onReorderOption ? (
                    <div className="flex flex-col gap-0.5 shrink-0 pt-1">
                      <button
                        type="button"
                        disabled={!canMoveUp}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => canMoveUp && onReorderOption(letter, "up")}
                        className={cn(
                          "p-1 rounded-organic-md border border-white/15 transition-colors",
                          canMoveUp
                            ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                            : "bg-white/[0.02] text-white/20 cursor-not-allowed border-white/5"
                        )}
                        title="Move option up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        disabled={!canMoveDown}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => canMoveDown && onReorderOption(letter, "down")}
                        className={cn(
                          "p-1 rounded-organic-md border border-white/15 transition-colors",
                          canMoveDown
                            ? "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
                            : "bg-white/[0.02] text-white/20 cursor-not-allowed border-white/5"
                        )}
                        title="Move option down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : null}
                  <div className="flex flex-col items-center gap-1.5 shrink-0 w-11">
                    {showAnswer && onCorrectOptionChange ? (
                      <input
                        type="radio"
                        name={`correct-option-${question.id}`}
                        checked={isCorrect}
                        onChange={() => onCorrectOptionChange(letter)}
                        className="h-3.5 w-3.5 accent-[#85BC82] cursor-pointer"
                        title="Set as correct answer"
                        aria-label={`Mark option ${letter} as correct`}
                      />
                    ) : null}
                  <div className={cn(
                    "flex-shrink-0 w-10 h-10 rounded-organic-md flex items-center justify-center font-bold text-sm transition-colors",
                    showAnswer && isCorrect
                      ? "bg-[#85BC82]/40 text-white"
                      : "bg-white/10 text-white/70"
                  )}>
                    {letter}
                  </div>
                  </div>
                  <div className="flex-1 flex items-start gap-3">
                    {/* Option */}
                    <div className={cn(showAnswer ? "flex-[0.2]" : "flex-1", "flex items-start gap-2")}>
                      {isEditingOption ? (
                        <textarea
                          value={options[letter] || ''}
                          onChange={(e) => onOptionChange(letter, e.target.value)}
                          onBlur={(e) => {
                            // Auto-remove if blank (handled in updateOption)
                            onOptionChange(letter, e.target.value);
                            onStopEditingField?.();
                          }}
                          autoFocus
                          className={cn(
                            "w-full min-h-[60px] p-3 rounded-organic-md bg-white/5 border text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                            showAnswer && isCorrect
                              ? "border-[#85BC82]/50 bg-[#85BC82]/10"
                              : "border-white/10"
                          )}
                          style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                        />
                      ) : (
                        <>
                          <div 
                            className={cn(
                              "w-full text-white/90 font-serif text-sm leading-relaxed p-3 rounded-organic-md transition-colors",
                              showAnswer && isCorrect
                                ? "bg-[#85BC82]/10 border border-[#85BC82]/30"
                                : ""
                            )}
                            style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                          >
                            <MathContent content={options[letter] || ''} />
                          </div>
                          {onStartEditingField && (
                            <button
                              onClick={() => {
                                if (isEditingOption) {
                                  onStopEditingField?.();
                                } else {
                                  onStartEditingField(`option_${letter}`);
                                }
                              }}
                              className={cn(
                                "p-1 rounded-organic-md transition-colors flex-shrink-0",
                                isEditingOption
                                  ? "bg-primary/20 hover:bg-primary/30 text-primary"
                                  : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                              )}
                              title={isEditingOption ? "Stop editing" : "Edit option"}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Why incorrect / correct — Right column */}
                    {showAnswer && (
                      <div className="flex-[0.8]">
                        {isCorrect ? (
                          <div className="p-3 rounded-organic-md border border-[#85BC82]/25 bg-[#85BC82]/5 text-sm text-[#85BC82]/90 font-mono">
                            Correct answer (use radio to change)
                          </div>
                        ) : onDistractorChange ? (
                          <div className="p-3 rounded-organic-md bg-white/5 border border-white/10 text-sm text-white/70 leading-relaxed font-serif">
                            {isEditingDistractor ? (
                              <textarea
                                value={distractorText}
                                onChange={(e) => onDistractorChange(letter, e.target.value)}
                                onBlur={() => onStopEditingField?.()}
                                autoFocus
                                placeholder="Why this option could be incorrect…"
                                className="w-full min-h-[72px] p-2 rounded-organic-md bg-white/5 border border-white/10 text-white/90 font-serif text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-white/30"
                                style={{ fontFamily: "'Times New Roman', Times, serif", lineHeight: '1.6' }}
                              />
                            ) : (
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-h-[2rem]">
                                  {distractorText.trim() ? (
                                    <MathContent content={distractorText} />
                                  ) : (
                                    <span className="text-white/35 italic text-sm font-serif">
                                      No explanation yet — use the pencil to add why this could be incorrect.
                                    </span>
                                  )}
                                </div>
                                {onStartEditingField && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isEditingDistractor) {
                                        onStopEditingField?.();
                                      } else {
                                        onStartEditingField(`distractor_${letter}`);
                                      }
                                    }}
                                    className={cn(
                                      "p-1 rounded-organic-md transition-colors flex-shrink-0",
                                      isEditingDistractor
                                        ? "bg-primary/20 hover:bg-primary/30 text-primary"
                                        : "bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/80"
                                    )}
                                    title={
                                      distractorText.trim()
                                        ? "Edit why this could be incorrect"
                                        : "Add why this could be incorrect"
                                    }
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 text-sm text-white/30 font-serif italic">—</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Add Option Button */}
          {onAddOption && optionLetters.length < 26 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  if (onAddOption) {
                    const newLetter = onAddOption();
                    if (newLetter !== null && newLetter !== undefined && onStartEditingField) {
                      // Start editing the new option immediately
                      setTimeout(() => {
                        onStartEditingField(`option_${newLetter}`);
                      }, 100);
                    }
                  }
                }}
                className="w-full px-4 py-3 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-all duration-fast ease-signature flex items-center justify-center gap-2 font-mono text-sm border border-white/20 border-dashed"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>Add Option</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Show Answer Button and Scroll Indicator */}
      <div className="p-4 border-t border-white/10 flex-shrink-0 flex items-center justify-between relative">
        <button
          onClick={() => {
            const wasHidden = !showAnswer;
            setShowAnswer(!showAnswer);
            if (wasHidden && onAnswerShown) {
              onAnswerShown();
            }
          }}
          className="px-4 py-2.5 rounded-organic-md bg-white/5 hover:bg-white/10 text-white/70 hover:text-white/90 transition-all duration-fast ease-signature flex items-center gap-2 font-mono text-sm border border-white/10"
        >
          <Eye className="w-4 h-4" strokeWidth={2.5} />
          <span>{showAnswer ? 'Hide Answer' : 'Show Answer'}</span>
        </button>
        
        {/* Scroll Down Indicator */}
        <div className="flex flex-col items-center gap-1 text-white/30 group">
          <span className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity">Scroll down</span>
          <ChevronDown className="w-4 h-4 animate-bounce" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}
