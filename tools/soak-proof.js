const { spawnSync } = require("node:child_process");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const cycles = Math.max(2, Number(process.env.KPR_SOAK_CYCLES || 2));
const soakRoot = join(root, ".artifacts", "soak");
mkdirSync(soakRoot, { recursive: true });
const results = [];

for (let cycle = 1; cycle <= cycles; cycle += 1) {
  const artifacts = join(soakRoot, `cycle-${String(cycle).padStart(2, "0")}`);
  const started = performance.now();
  const run = spawnSync(process.execPath, ["tools/e2e-proof.js"], {
    cwd: root,
    env: {
      ...process.env,
      KPR_E2E_ARTIFACTS: artifacts,
      KPR_E2E_PORT: String(4173 + cycle),
      KPR_E2E_STRICT_WARNINGS: "1",
    },
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
  });
  const elapsedMs = Math.round(performance.now() - started);
  process.stdout.write(run.stdout || "");
  process.stderr.write(run.stderr || "");
  if (run.status !== 0) process.exit(run.status || 1);
  const report = JSON.parse(readFileSync(join(artifacts, "report.json"), "utf8"));
  results.push({
    cycle,
    elapsedMs,
    ok: report.ok,
    stages: report.stages.length,
    reportableWarnings: report.console.filter(({ type }) => type === "error").length,
    runtimeChecks: Object.keys(report.checks).length,
  });
}

const summary = {
  version: "v259",
  cycles,
  coldMs: results[0].elapsedMs,
  warmMedianMs: results.slice(1).map(({ elapsedMs }) => elapsedMs).sort((a, b) => a - b)[Math.floor((cycles - 1) / 2)],
  results,
  status: results.every(({ ok, reportableWarnings }) => ok && reportableWarnings === 0) ? "passed" : "failed",
};
writeFileSync(join(soakRoot, "soak-report-v259.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(`[OK] ${cycles}-cycle browser soak v259 complete`);
