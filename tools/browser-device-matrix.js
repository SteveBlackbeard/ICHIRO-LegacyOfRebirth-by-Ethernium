const { spawnSync } = require("node:child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const artifacts = join(root, ".artifacts", "browser-matrix");
const windowsRoots = [
  process.env.ProgramFiles,
  process.env["ProgramFiles(x86)"],
  process.env.LOCALAPPDATA,
].filter(Boolean);
const requested = new Set(
  (process.env.KPR_MATRIX_TARGETS || "chrome,edge")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);

const targets = [
  {
    key: "chrome",
    candidates: [
      process.env.KPR_MATRIX_CHROME_PATH,
      ...windowsRoots.map((base) => join(base, "Google", "Chrome", "Application", "chrome.exe")),
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
    ],
  },
  {
    key: "edge",
    candidates: [
      process.env.KPR_MATRIX_EDGE_PATH,
      ...windowsRoots.map((base) => join(base, "Microsoft", "Edge", "Application", "msedge.exe")),
      "/usr/bin/microsoft-edge",
      "/usr/bin/microsoft-edge-stable",
    ],
  },
].filter(({ key }) => requested.has(key));

mkdirSync(artifacts, { recursive: true });

const summary = {
  version: "v263",
  startedAt: new Date().toISOString(),
  platform: process.platform,
  targets: [],
};

for (const [index, target] of targets.entries()) {
  const executablePath = target.candidates.filter(Boolean).find((candidate) => existsSync(candidate));
  if (!executablePath) {
    summary.targets.push({
      key: target.key,
      ok: false,
      failure: "browser executable not found",
    });
    continue;
  }

  const targetArtifacts = join(artifacts, target.key);
  const result = spawnSync(process.execPath, [join(root, "tools", "e2e-proof.js")], {
    cwd: root,
    env: {
      ...process.env,
      KPR_E2E_ARTIFACTS: targetArtifacts,
      KPR_E2E_BROWSER_ENGINE: "chrome",
      KPR_E2E_BROWSER_LABEL: target.key,
      KPR_E2E_BROWSER_PATH: executablePath,
      KPR_E2E_PORT: String(4191 + index),
    },
    stdio: "inherit",
  });

  const reportPath = join(targetArtifacts, "report.json");
  const report = existsSync(reportPath)
    ? JSON.parse(readFileSync(reportPath, "utf8"))
    : null;
  summary.targets.push({
    key: target.key,
    executablePath,
    ok: result.status === 0 && report?.ok === true,
    exitCode: result.status,
    browser: report?.browser || null,
    stages: report?.stages?.length || 0,
    contracts: Object.keys(report?.checks || {}).length,
    failure: report?.failure || result.error?.message || null,
  });
}

summary.completedAt = new Date().toISOString();
summary.ok = summary.targets.length === targets.length
  && summary.targets.length === requested.size
  && summary.targets.every(({ ok }) => ok);
writeFileSync(join(artifacts, "report.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

for (const target of summary.targets) {
  console.log(
    `[${target.ok ? "OK" : "FAIL"}] ${target.key}: `
      + `${target.stages || 0} stage(s), ${target.contracts || 0} contract(s)`,
  );
}
if (!summary.ok) {
  console.error("[FAIL] browser/device matrix v263 incomplete");
  process.exitCode = 1;
} else {
  console.log("[OK] browser/device matrix v263 complete");
}
