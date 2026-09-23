const { execSync } = require("child_process");
const fs = require("fs");

const lines = execSync("git show 3cafa26:src/app/past-papers/mark/page.tsx", {
  encoding: "utf8",
}).split("\n");

const findLine = (pattern, from = 0) =>
  lines.findIndex((l, i) => i >= from && l.includes(pattern));

const sectionPerf = findLine(
  "Section Performance & Score Conversion (moved up next to Time Management)",
);
const guessing = findLine("Guessing Behavior (separate container)");
const pacingStart = findLine("{/* Pacing Profile */}");
const mistakeStart = findLine("{/* Mistake Analysis */}");
const mistakeEnd = findLine("Time vs Question Chart - Full Width");

if ([sectionPerf, guessing, pacingStart, mistakeStart, mistakeEnd].some((i) => i < 0)) {
  console.error("markers missing", {
    sectionPerf,
    guessing,
    pacingStart,
    mistakeStart,
    mistakeEnd,
  });
  process.exit(1);
}

let pacingEndLine = pacingStart;
while (pacingEndLine < lines.length && !lines[pacingEndLine].includes("TimeScatterChart")) {
  pacingEndLine++;
}
while (pacingEndLine < lines.length && !lines[pacingEndLine].trim().startsWith("</div>")) {
  pacingEndLine++;
}
pacingEndLine++;

const pacingBlock = lines.slice(pacingStart, pacingEndLine);
const scoreBlock = lines.slice(sectionPerf, guessing).map((l) =>
  l.replace("md:col-start-2 md:row-start-1", "").replace(/\s*md:col-span-2/, ""),
);

// 1) Remove score block from stats (before overview edits)
let out = [...lines];
out.splice(sectionPerf, guessing - sectionPerf);

// Re-find pacing in overview after stats deletion shifted lines
const pacingStart2 = out.findIndex((l) => l.includes("{/* Pacing Profile */}"));
let pacingEnd2 = pacingStart2;
while (pacingEnd2 < out.length && !out[pacingEnd2].includes("TimeScatterChart")) {
  pacingEnd2++;
}
while (pacingEnd2 < out.length && !out[pacingEnd2].trim().startsWith("</div>")) {
  pacingEnd2++;
}
pacingEnd2++;

// 2) Replace pacing in overview with score block
out.splice(pacingStart2, pacingEnd2 - pacingStart2, ...scoreBlock);

// 3) Insert pacing at top of stats
const statsStart = out.findIndex((l) => l.includes('{markSection === "stats"'));
const statsGrid = out.findIndex(
  (l, i) => i > statsStart && l.includes("Main Content Grid"),
);
out.splice(statsGrid, 0, "", ...pacingBlock, "");

for (let i = 0; i < out.length; i++) {
  if (
    out[i].includes("Time Management Analysis") &&
    out[i + 1]?.includes("md:col-start-1")
  ) {
    out[i + 1] = out[i + 1].replace(
      "md:col-start-1 md:row-start-1",
      "md:col-span-2",
    );
  }
}

const mistakeStart2 = out.findIndex((l) => l.includes("{/* Mistake Analysis */}"));
const mistakeEnd2 = out.findIndex((l) =>
  l.includes("Time vs Question Chart - Full Width"),
);
if (mistakeStart2 >= 0 && mistakeEnd2 > mistakeStart2) {
  out.splice(mistakeStart2, mistakeEnd2 - mistakeStart2);
}

fs.writeFileSync("src/app/past-papers/mark/page.tsx", out.join("\n"));
console.log("OK", out.length, "lines");
