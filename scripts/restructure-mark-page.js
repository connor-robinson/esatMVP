const fs = require("fs");
const path = "src/app/past-papers/mark/page.tsx";
let s = fs.readFileSync(path, "utf8");

// --- 1. Extract overview (hero + pills + pacing) and stats blocks from review right column ---
const ternaryStart = s.indexOf("              {selectedIndex === -1 ? (");
const mainGridStart = s.indexOf("                  {/* Main Content Grid */}");
const ternaryElse = s.indexOf("              ) : (", mainGridStart);

if (ternaryStart < 0 || mainGridStart < 0 || ternaryElse < 0) {
  console.error("Failed to find ternary markers", {
    ternaryStart,
    mainGridStart,
    ternaryElse,
  });
  process.exit(1);
}

const overviewStart = s.indexOf('<div className="space-y-6">', ternaryStart) + '<div className="space-y-6">'.length;
const overviewBlock = s.slice(overviewStart, mainGridStart);
const statsBlock = s.slice(mainGridStart, ternaryElse);

// --- 2. Replace right column: remove overview/stats ternary, keep question review only ---
const rightColComment = "            {/* Right column: detail view (fills, scrolls) */}";
const rightColIdx = s.indexOf(rightColComment);

const questionReviewStart = ternaryElse + "              ) : (".length;
// Find end of question review ternary: `              )}` before fullscreen comment
const fullscreenIdx = s.indexOf("              {/* Fullscreen overlay */}", questionReviewStart);
const reviewTernaryEnd = s.lastIndexOf("              )}", fullscreenIdx);

const questionReviewBlock = s.slice(questionReviewStart, reviewTernaryEnd);

const newRightColumn = `            {/* Right column: question detail */}
            <div className="h-full min-h-0 overflow-y-auto rounded-2xl p-4" style={{ scrollbarGutter: 'stable' }}>
              {selectedIndex >= 0 ? (
${questionReviewBlock}              ) : (
                <div className="flex h-full min-h-48 items-center justify-center text-sm text-text-muted">
                  Select a question from the list.
                </div>
              )}
`;

const afterReviewTernary = s.slice(reviewTernaryEnd);
const beforeRightCol = s.slice(0, rightColIdx);

s = beforeRightCol + newRightColumn + afterReviewTernary;

// --- 3. Close review grid branch and add other sections before </Card> ---
const mainCardCloseMatch = s.match(
  /            <\/div>\r?\n          <\/div>\r?\n        <\/Card>\r?\n\r?\n        \{\/\* Statistics section removed/,
);

if (!mainCardCloseMatch) {
  console.error("main card close not found");
  process.exit(1);
}

const mainCardClose = mainCardCloseMatch.index;
const mainCardCloseLen = mainCardCloseMatch[0].length;

const otherSections = `            </div>
          </div>
              ) : markSection === "overview" ? (
                <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6" style={{ scrollbarGutter: 'stable' }}>
                  <div className="space-y-6">
${overviewBlock}                  </div>
                </div>
              ) : markSection === "stats" ? (
                <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6" style={{ scrollbarGutter: 'stable' }}>
                  <div className="space-y-6">
${statsBlock}                  </div>
                </div>
              ) : null}
        </Card>

        {/* PLACEHOLDER_MISTAKES */}`;

s =
  s.slice(0, mainCardClose) +
  otherSections +
  s.slice(mainCardClose + mainCardCloseLen);

// --- 4. Wrap mistakes section ---
s = s.replace(
  "        {/* PLACEHOLDER_MISTAKES */}\n\n        {/* Notes & insights moved to bottom and restyled */}\n\n        {/* Mistake Analysis & Drill Setup */}\n        <Card className=\"p-6 border-0\">",
  `        {markSection === "mistakes" && (
            <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-surface p-0">
              <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">`,
);

// Find end of mistakes card - before Session Notes
const sessionNotesStart = s.indexOf("        {/* Session Notes - bottom, modern styling */}");
const mistakesCardEnd = s.lastIndexOf("        </Card>", sessionNotesStart);

s =
  s.slice(0, mistakesCardEnd) +
  `              </div>
            </Card>
          )}

          {markSection === "notes" && (
            <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-surface p-0">
              <div className="h-full min-h-0 overflow-y-auto p-4 sm:p-6">` +
  s.slice(mistakesCardEnd + "        </Card>".length, sessionNotesStart) +
  s.slice(sessionNotesStart);

// Close notes section
s = s.replace(
  /          <\/Card>\n\n        \{\/\* Key insights removed per design \*\/\}/,
  `              </div>
            </Card>
          )}
`,
);

// --- 5. Fix footer ---
s = s.replace(
  /        \{\/\* Actions \*\/\n        <div className="flex justify-end gap-3">[\s\S]*?<\/div>\n      <\/div>\n    <\/Container>/,
  `        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border-subtle px-1 pt-3 sm:hidden">
          <Button
            variant="secondary"
            className="rounded-organic-md border border-border bg-surface-elevated px-4 py-2 text-sm text-text-muted"
            onClick={() => router.push("/past-papers/library")}
          >
            New Session
          </Button>
          <Button
            variant="primary"
            className="rounded-organic-md px-4 py-2 text-sm shadow-glow"
            onClick={handleSaveAndContinue}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save & Continue"}
          </Button>
        </div>
        </div>
      </div>`,
);

// --- 6. openQuestionInReview for mistake buttons ---
s = s.replaceAll(
  "onClick={() => setSelectedIndex(index)}>Q{qn}",
  "onClick={() => openQuestionInReview(index)}>Q{qn}",
);

if (!s.includes("<Container")) {
  s = s.replace(
    'import { Container } from "@/components/layout/Container";\n',
    "",
  );
}

// Remove duplicate Statistics comment block if orphaned
s = s.replace(
  /        \{\/\* Statistics section removed; moved into Overview toggle \*\/\n\n/g,
  "",
);

fs.writeFileSync(path, s);
console.log("OK");
