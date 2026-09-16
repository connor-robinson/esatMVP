/**
 * Cursor beforeShellExecution hook: block `git commit` until route + tsc checks pass.
 * Windows-friendly (Node, no bash/jq required).
 */
const { spawnSync } = require("child_process");

function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", () => resolve(""));
  });
}

function respond(payload) {
  process.stdout.write(JSON.stringify(payload));
}

async function main() {
  const raw = await readStdin();
  let command = "";
  try {
    command = String(JSON.parse(raw || "{}").command || "");
  } catch {
    respond({ permission: "allow" });
    return;
  }

  // Only gate real commits (not commit --help, status, etc.).
  const isCommit =
    /\bgit\s+commit\b/i.test(command) &&
    !/\b--help\b/.test(command) &&
    !/\b-h\b/.test(command);

  if (!isCommit) {
    respond({ permission: "allow" });
    return;
  }

  if (/\b--no-verify\b|\b-n\b/.test(command)) {
    respond({
      permission: "deny",
      user_message:
        "Blocked --no-verify. Pre-commit type/route checks must run before commits.",
      agent_message:
        "Do not bypass hooks with --no-verify. Run `npm run precommit:check`, fix errors, then commit normally.",
    });
    return;
  }

  const check = spawnSync("npm", ["run", "precommit:check"], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    encoding: "utf8",
    env: process.env,
  });

  if (check.status === 0) {
    respond({ permission: "allow" });
    return;
  }

  const output = `${check.stdout || ""}\n${check.stderr || ""}`.trim();
  const excerpt = output.slice(-2500);
  respond({
    permission: "deny",
    user_message: "Pre-commit checks failed. Fix type/route errors before committing.",
    agent_message: `precommit:check failed. Fix these before git commit:\n\n${excerpt}`,
  });
}

main().catch(() => {
  // Fail closed for commits only if we somehow crash mid-check.
  respond({
    permission: "deny",
    user_message: "Pre-commit hook crashed; commit blocked.",
    agent_message: "Cursor pre-commit gate crashed. Run `npm run precommit:check` manually.",
  });
});
