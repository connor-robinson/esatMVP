const fs = require("fs");
const path = "src/app/past-papers/mark/page.tsx";
const lines = fs.readFileSync(path, "utf8").split("\n");

const findLine = (pattern) =>
  lines.findIndex((l) => l.includes(pattern));

const sectionPerf = findLine(
  "Section Performance & Score Conversion (moved up next to Time Management)",
);
const guessing = findLine("Guessing Behavior (separate container)");
const overviewInsert = findLine(
  "Combined Guess Distribution moved into Guessing Behavior",
);
const statsGrid = findLine("Main Content Grid");
const mistakeStart = findLine("{/* Mistake Analysis */}");
const mistakeEnd = findLine("Time vs Question Chart - Full Width");

if (
  [sectionPerf, guessing, overviewInsert, statsGrid, mistakeStart, mistakeEnd].some(
    (i) => i < 0,
  )
) {
  console.error("markers", {
    sectionPerf,
    guessing,
    overviewInsert,
    statsGrid,
    mistakeStart,
    mistakeEnd,
  });
  process.exit(1);
}

const scoreLines = lines.slice(sectionPerf, guessing);
const newLines = [
  ...lines.slice(0, sectionPerf),
  ...lines.slice(guessing),
];

// Re-find after deletion
const overviewInsert2 = newLines.findIndex((l) =>
  l.includes("Combined Guess Distribution moved into Guessing Behavior"),
);
newLines.splice(overviewInsert2 + 2, 0, ...scoreLines);

// Fix overview score section layout classes
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].includes("md:col-start-2 md:row-start-1")) {
    newLines[i] = newLines[i].replace(
      "md:col-start-2 md:row-start-1",
      "",
    );
  }
}

const statsGrid2 = newLines.findIndex((l) => l.includes("Main Content Grid"));
const pacingBlock = [
  "                    {/* Pacing Profile */}",
  "                    <div className={`${bubbleClass}`}>",
  "                      <div className=\"text-base font-semibold text-neutral-100 mb-4\">Pacing Profile</div>",
  "                      <TimeScatterChart",
  "                        questionNumbers={questionNumbers}",
  "                        perQuestionSec={perQuestionSec}",
  "                        correctFlags={derivedCorrectFlags}",
  "                        guessedFlags={guessedFlags}",
  "                      />",
  "                    </div>",
  "",
];
newLines.splice(statsGrid2, 0, ...pacingBlock);

// Time management full width
for (let i = 0; i < newLines.length; i++) {
  if (
    newLines[i].includes("Time Management Analysis") &&
    newLines[i + 1]?.includes("md:col-start-1")
  ) {
    newLines[i + 1] = newLines[i + 1].replace(
      "md:col-start-1 md:row-start-1",
      "md:col-span-2",
    );
  }
}

const mistakeStart2 = newLines.findIndex((l) =>
  l.includes("{/* Mistake Analysis */}"),
);
const mistakeEnd2 = newLines.findIndex((l) =>
  l.includes("Time vs Question Chart - Full Width"),
);
if (mistakeStart2 >= 0 && mistakeEnd2 > mistakeStart2) {
  newLines.splice(mistakeStart2, mistakeEnd2 - mistakeStart2);
}

fs.writeFileSync(path, newLines.join("\n"));
console.log("OK", { scoreLines: scoreLines.length });
