const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const moduleSource = readFileSync(join(root, "modules", "observability.js"), "utf8");
const appSource = readFileSync(join(root, "app.js"), "utf8");
const failures = [];

function requirePattern(pattern, message) {
  if (!pattern.test(moduleSource)) failures.push(message);
}

requirePattern(/MAX_EVENTS\s*=\s*96/, "diagnostic event buffer is not bounded");
requirePattern(/networkTransmission:\s*false/, "diagnostics do not explicitly disable transmission");
requirePattern(/webglcontextlost/, "WebGL context loss is not observed");
requirePattern(/asset-failure/, "asset failures are not observed");
requirePattern(/PerformanceObserver/, "performance entries are not aggregated");
requirePattern(/exportReport/, "explicit local report export is missing");
requirePattern(/safeResourceLabel/, "resource names are not sanitized");

for (const forbidden of [/\bfetch\s*\(/, /\bsendBeacon\s*\(/, /\bWebSocket\s*\(/, /\bXMLHttpRequest\b/, /\blocalStorage\b/, /\bsessionStorage\b/]) {
  if (forbidden.test(moduleSource)) failures.push(`observability contains forbidden persistence/transmission: ${forbidden}`);
}
if (!/createLocalObservability/.test(appSource)) failures.push("observability is not instantiated by app.js");
if (!/runtimeLifecycle\.register\("observability"/.test(appSource)) failures.push("observability has no lifecycle owner");

const report = {
  version: "v259",
  boundedEvents: 96,
  networkTransmission: false,
  violations: failures,
  status: failures.length ? "failed" : "passed",
};
const output = join(root, ".artifacts", "observability", "observability-contract-v259.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[INFO] report: ${output}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] local observability v259 contract complete");
