from pathlib import Path
import shutil
import re

ROOT = Path(r"c:/Users/anson/Desktop/nocalcMVP2_real")

# 1) API create route
shutil.copyfile(
    ROOT / ".tmp_restore/rooms__route.ts",
    ROOT / "src/app/api/mock-compare/rooms/route.ts",
)
print("OK api route")

# 2) Start modal — compare under Start
modal = ROOT / "src/components/papers/roadmap/RoadmapStartSessionModal.tsx"
t = modal.read_text(encoding="utf-8")

if "Users" not in t:
    t = t.replace(
        'import { X, Play } from "lucide-react";',
        'import { X, Play, Users } from "lucide-react";',
    )

if "onCompareWithFriend?" not in t:
    t = t.replace(
        """  onStart: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
};""",
        """  onStart: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
  /** Same settings as Start — opens share-link invite instead of sitting yet. */
  onCompareWithFriend?: (
    stage: RoadmapStage,
    selectedParts: RoadmapPart[],
    options: RoadmapStartOptions,
  ) => void;
};""",
        1,
    )

if "onCompareWithFriend," not in t:
    t = t.replace(
        """export function RoadmapStartSessionModal({
  open,
  stage,
  partCompletion,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  onClose,
  onStart,
}: Props) {""",
        """export function RoadmapStartSessionModal({
  open,
  stage,
  partCompletion,
  newQuestionsOnly,
  onNewQuestionsOnlyChange,
  onClose,
  onStart,
  onCompareWithFriend,
}: Props) {""",
        1,
    )

# Ensure handleCompare exists near handleStart
if "const handleCompare" not in t:
    # Find handleStart body end
    m = re.search(
        r"const handleStart = \(\) => \{\n(?:.*\n)*?  \};\n",
        t,
    )
    if not m:
        raise SystemExit("handleStart not found")
    # Need selection variable — read how handleStart works
    handle_start = m.group(0)
    # Common pattern uses selectedParts inline
    if "selection" in handle_start or "selectedParts" in handle_start:
        insert = (
            handle_start
            + """
  const handleCompare = () => {
    if (!onCompareWithFriend) return;
    const parts = expandDisplayGroupsToParts(
      displayGroups.filter((g) => selectedGroups.has(g.key)),
    );
    if (parts.length === 0) return;
    onCompareWithFriend(stage, parts, {
      newQuestionsOnly: effectiveNewQuestionsOnly,
    });
  };
"""
        )
        t = t.replace(handle_start, insert, 1)
    else:
        raise SystemExit("unexpected handleStart:\n" + handle_start)

if "Compare with a friend" not in t:
    old_footer = """        <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={selectedGroups.size === 0}
            onClick={handleStart}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-sm font-semibold transition-colors",
              selectedGroups.size > 0
                ? "bg-primary text-white hover:bg-primary-hover"
                : "cursor-not-allowed bg-surface-neutral text-text-disabled",
            )}
          >
            Start session
            <Play className="h-3.5 w-3.5 fill-current opacity-90" aria-hidden />
          </button>
        </div>"""
    new_footer = """        <div className="flex flex-col gap-2 border-t border-border-subtle px-5 py-4">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-mid hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedGroups.size === 0}
              onClick={handleStart}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-sm font-semibold transition-colors",
                selectedGroups.size > 0
                  ? "bg-primary text-white hover:bg-primary-hover"
                  : "cursor-not-allowed bg-surface-neutral text-text-disabled",
              )}
            >
              Start session
              <Play className="h-3.5 w-3.5 fill-current opacity-90" aria-hidden />
            </button>
          </div>
          {onCompareWithFriend ? (
            <button
              type="button"
              disabled={selectedGroups.size === 0}
              onClick={handleCompare}
              className={cn(
                "inline-flex w-full items-center justify-center gap-1.5 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
                selectedGroups.size > 0
                  ? "bg-surface-elevated text-text hover:bg-surface-mid"
                  : "cursor-not-allowed bg-surface-neutral text-text-disabled",
              )}
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              Compare with a friend
            </button>
          ) : null}
        </div>"""
    if old_footer not in t:
        raise SystemExit("footer not found")
    t = t.replace(old_footer, new_footer, 1)

modal.write_text(t, encoding="utf-8")
print("OK start modal")

# 3) SplitView wait / peek
split = ROOT / "src/components/mockCompare/MockCompareSplitView.tsx"
st = split.read_text(encoding="utf-8")
if "View my results first" not in st:
    if 'import { useEffect, useState } from "react";' not in st:
        st = st.replace(
            '"use client";\n\nimport Link from "next/link";',
            '"use client";\n\nimport { useEffect, useState } from "react";\nimport Link from "next/link";',
        )
    st = st.replace(
        """  const meResults = me?.results ?? null;
  const friendResults = friend?.results ?? null;
  const bothDone = Boolean(meResults && friendResults);

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
""",
        """  const meResults = me?.results ?? null;
  const friendResults = friend?.results ?? null;
  const bothDone = Boolean(meResults && friendResults);
  const waitingOnFriend = Boolean(meResults && !friendResults);
  const [peekMyResults, setPeekMyResults] = useState(false);

  useEffect(() => {
    if (friendResults) setPeekMyResults(false);
  }, [friendResults]);

  const showSplit =
    bothDone || (waitingOnFriend && peekMyResults) || !waitingOnFriend;

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
""",
        1,
    )
    wait_block = """
      {waitingOnFriend && !peekMyResults ? (
        <div
          className={cn(
            "flex flex-col items-center gap-4 rounded-md px-4 py-12 text-center",
            marketing ? "bg-[#161D2F]" : "bg-surface",
          )}
        >
          <p
            className={cn(
              "text-sm font-medium",
              marketing ? "text-white" : "text-text",
            )}
          >
            Waiting for your friend to finish
          </p>
          <p
            className={cn(
              "max-w-sm text-xs leading-relaxed",
              marketing ? "text-[#94A3B8]" : "text-text-muted",
            )}
          >
            Their side will load here automatically. You can peek at your own
            results while you wait.
          </p>
          <button
            type="button"
            onClick={() => setPeekMyResults(true)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold",
              marketing
                ? "bg-white/[0.1] text-white hover:bg-white/[0.14]"
                : "bg-surface-elevated text-text hover:bg-surface-mid",
            )}
          >
            View my results first
          </button>
        </div>
      ) : null}

"""
    # Insert before the split columns
    marker = '      <div className="flex flex-col gap-3 lg:flex-row">'
    if marker not in st:
        raise SystemExit("split columns marker missing")
    st = st.replace(marker, wait_block + "      {showSplit ? (\n      <div className=\"flex flex-col gap-3 lg:flex-row\">", 1)
    # Close the showSplit conditional after the columns div — find end of columns section
    # The columns section ends before `{bothDone &&`
    both_marker = "      {bothDone && meResults && friendResults ? ("
    if both_marker not in st:
        raise SystemExit("bothDone marker missing")
    st = st.replace(
        both_marker,
        "      ) : null}\n\n      {bothDone && meResults && friendResults ? (",
        1,
    )
    split.write_text(st, encoding="utf-8")
    print("OK split wait/peek")
else:
    print("split already has peek")

# 4) Roadmap autostart should set active compare context
rp = ROOT / "src/app/past-papers/roadmap/page.tsx"
rt = rp.read_text(encoding="utf-8")
if "setActiveMockCompare" not in rt:
    rt = rt.replace(
        "import { takePendingCompareStart } from '@/lib/mockCompare/client';",
        "import {\n  setActiveMockCompare,\n  takePendingCompareStart,\n} from '@/lib/mockCompare/client';",
    )
    old = """    compareStartHandledRef.current = true;
    const stage = getRoadmapStagesSync().find(
      (s) => s.id === pending.roadmapStart!.stageId,
    );
    if (!stage) return;
    void handleStartStage(
      stage,
      pending.roadmapStart.selectedParts,
      pending.roadmapStart.options,
    );"""
    new = """    compareStartHandledRef.current = true;
    setActiveMockCompare({
      roomId: pending.roomId,
      participantId: pending.participantId,
      displayName: pending.displayName,
      paperLabel: pending.paperLabel,
    });
    const stage = getRoadmapStagesSync().find(
      (s) => s.id === pending.roadmapStart!.stageId,
    );
    if (!stage) return;
    void handleStartStage(
      stage,
      pending.roadmapStart.selectedParts,
      pending.roadmapStart.options,
    );"""
    if old not in rt:
        raise SystemExit("autostart block not found")
    rt = rt.replace(old, new, 1)
    rp.write_text(rt, encoding="utf-8")
    print("OK roadmap active ctx")
else:
    print("roadmap already sets active")

# Verify key markers
checks = {
    "api roadmapStart": "roadmapStart" in (ROOT/"src/app/api/mock-compare/rooms/route.ts").read_text(encoding="utf-8"),
    "modal compare btn": "Compare with a friend" in modal.read_text(encoding="utf-8"),
    "table invite": "CompareInviteModal" in (ROOT/"src/components/papers/roadmap/RoadmapTable.tsx").read_text(encoding="utf-8"),
    "split peek": "View my results first" in split.read_text(encoding="utf-8"),
    "types roadmap": "MockCompareRoadmapStart" in (ROOT/"src/lib/mockCompare/types.ts").read_text(encoding="utf-8"),
    "join client": (ROOT/"src/components/mockCompare/MockCompareJoinClient.tsx").exists(),
    "invite modal": (ROOT/"src/components/mockCompare/CompareInviteModal.tsx").exists(),
}
for k, v in checks.items():
    print(f"{k}: {v}")
    if not v:
        raise SystemExit(f"FAILED {k}")
print("ALL CHECKS PASSED")
