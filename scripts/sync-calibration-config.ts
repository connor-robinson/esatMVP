/**
 * Sync the canonical Math 1 calibration config into the app bundle.
 *
 * Reads:
 *   src/lib/calibration/math1/esat_math1_full_calibration_test_v1_diagramsfixed.json
 * Force-patches diagram SVGs from:
 *   src/lib/calibration/math1/diagrams/esat_math1_calibration_q04_circle_fixed.svg
 *   src/lib/calibration/math1/diagrams/esat_math1_calibration_q11_cuboid_fixed.svg
 *
 * Writes:
 *   src/lib/calibration/math1/config.json
 *
 * Run: npx tsx scripts/sync-calibration-config.ts
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const MATH1 = path.join(ROOT, "src/lib/calibration/math1");
const CANONICAL = path.join(MATH1, "esat_math1_full_calibration_test_v1_diagramsfixed.json");
const BUNDLE = path.join(MATH1, "config.json");
const DIAGRAMS = path.join(MATH1, "diagrams");

const PATCHES: Record<string, string> = {
  "m1cal-q04": "esat_math1_calibration_q04_circle_fixed.svg",
  "m1cal-q11": "esat_math1_calibration_q11_cuboid_fixed.svg",
};

function main() {
  if (!fs.existsSync(CANONICAL)) {
    console.error(`Missing canonical config: ${CANONICAL}`);
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CANONICAL, "utf8")) as {
    test: { questions: { id: string; diagram_svg: string | null }[]; version: number };
  };

  for (const q of config.test.questions) {
    const patchFile = PATCHES[q.id];
    if (!patchFile) continue;
    const patchPath = path.join(DIAGRAMS, patchFile);
    if (!fs.existsSync(patchPath)) {
      console.warn(`Patch SVG missing for ${q.id}: ${patchPath}`);
      continue;
    }
    q.diagram_svg = fs.readFileSync(patchPath, "utf8").trim();
    console.log(`Patched ${q.id} from ${patchFile}`);
  }

  fs.writeFileSync(BUNDLE, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Wrote ${BUNDLE} (content version ${config.test.version}).`);
}

main();
