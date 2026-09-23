const fs = require("fs");
const lines = fs.readFileSync("src/app/past-papers/mark/page.tsx", "utf8").split("\n");

function balance(s, e) {
  let d = 0;
  for (let i = s; i <= e; i++) {
    d +=
      (lines[i].match(/<div[\s>]/g) || []).length -
      (lines[i].match(/<\/div>/g) || []).length;
  }
  return d;
}

const oS = lines.findIndex((l) => l.includes('markSection === "overview"'));
const oE = lines.findIndex((l) => l.includes('markSection === "stats"'));
const sE = lines.findIndex((l) => l.includes('markSection === "review"'));

console.log("overview", balance(oS, oE - 1));
console.log("stats", balance(oE, sE - 1));
