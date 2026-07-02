/**
 * @deprecated Use scripts/import-esat-hook-sets.ts --only=math1
 */
import { spawnSync } from "child_process";
import path from "path";

const result = spawnSync(
  process.execPath,
  [
    path.join(__dirname, "..", "node_modules", "tsx", "dist", "cli.mjs"),
    path.join(__dirname, "import-esat-hook-sets.ts"),
    "--only=math1",
  ],
  { stdio: "inherit", cwd: path.join(__dirname, "..") },
);

process.exit(result.status ?? 1);
