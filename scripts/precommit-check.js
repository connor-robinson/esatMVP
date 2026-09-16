/**
 * Fast pre-commit / pre-push gates that catch the failures Vercel hits often:
 * - illegal App Router route exports
 * - TypeScript errors (same strictness as next build's type phase for app code)
 */
const { spawnSync } = require("child_process");

function run(label, command, args) {
  console.log(`\n→ ${label}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`\n✗ ${label} failed (exit ${result.status ?? "unknown"}).`);
    process.exit(result.status || 1);
  }
}

run("Route export check", "npm", ["run", "check:routes"]);
run("TypeScript check", "npm", ["run", "type-check"]);
console.log("\n✓ Pre-commit checks passed.");
