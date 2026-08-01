const { existsSync, readFileSync, readdirSync, statSync } = require("node:fs");
const { dirname, extname, join, relative } = require("node:path");

const root = dirname(dirname(__filename));
const excluded = new Set([
  "node_modules",
  ".git",
  ".artifacts",
  "scratch",
  "exports",
  ".video_vendor",
]);
const runtimeText = ["index.html", "app.js", "archive-3d.js", "server.js"];
const maxGitBlob = 100_000_000;
const lfsFiles = new Set([
  "assets/models/YATAGARASU BASE LOW.glb",
  "assets/models/yatagarasu-blueprint-budget.glb",
  "assets/video/designation-silent-sentinel.mp4",
  "assets/video/portal-transition.mp4",
  "assets/video/grok-transition.mp4",
]);

function walk(dir, output = []) {
  for (const name of readdirSync(dir)) {
    if (excluded.has(name)) continue;
    const file = join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) walk(file, output);
    else output.push(file);
  }
  return output;
}

const files = walk(root);
const failures = [];
const warnings = [];
const secretPattern = /(ghp_[A-Za-z0-9]+|github_pat_[A-Za-z0-9_]+|BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY|api[_-]?key\s*[:=]\s*["'][^"']+)/i;
const personalPathPattern = /(?:[A-Za-z]:\\Users\\|file:\/\/\/|\/Users\/|\/home\/)/i;

for (const file of files) {
  const rel = relative(root, file).replaceAll("\\", "/");
  const size = statSync(file).size;
  if (size >= maxGitBlob && !lfsFiles.has(rel)) {
    failures.push(`${rel}: ${size} bytes exceeds GitHub's normal blob limit`);
  }
  if ([".html", ".js", ".css", ".json", ".md", ".yml", ".yaml", ".txt", ".ps1", ".py"].includes(extname(file).toLowerCase())) {
    const text = readFileSync(file, "utf8");
    if (secretPattern.test(text)) failures.push(`${rel}: potential secret`);
    if (personalPathPattern.test(text)) failures.push(`${rel}: personal absolute machine path`);
  }
}

for (const required of [
  "assets/video/portal-transition-production.mp4",
  "assets/video/designation-silent-sentinel-budget.mp4",
  "assets/models/yatagarasu-blueprint-studio.glb",
]) {
  if (!existsSync(join(root, required))) failures.push(`${required}: required production asset missing`);
}

for (const file of runtimeText) {
  const text = readFileSync(join(root, file), "utf8");
  if (secretPattern.test(text)) failures.push(`${file}: secret-like value`);
  if (personalPathPattern.test(text)) failures.push(`${file}: machine-specific path`);
}

console.log(`[INFO] scanned ${files.length} publishable files`);
console.log(`[INFO] ${warnings.length} non-runtime absolute-path warning(s)`);
for (const warning of warnings.slice(0, 10)) console.log(`[WARN] ${warning}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] production readiness contract complete");
