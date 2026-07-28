const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { execFileSync } = require("node:child_process");

const root = resolve(__dirname, "..");
const output = join(root, ".artifacts", "runtime", "runtime-report-v254.json");
const failures = [];
const allowedPhases = new Set([
  "prelaunch",
  "hack-intro",
  "access-terminal",
  "character-profile",
  "dossier",
  "archive-video",
  "map",
  "story",
]);

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function requireMatch(text, pattern, message) {
  if (!pattern.test(text)) failures.push(message);
}

const app = read("app.js");
const lifecycle = read("modules/runtime-lifecycle.js");
const kpco = read("modules/kpco-logo.js");
const phase = read("modules/runtime-phase.js");
const registrations = [];
const registrationPattern = /runtimeLifecycle\.register\(\s*["']([^"']+)["']\s*,[\s\S]*?(?:,\s*\{\s*phases:\s*\[([^\]]*)\][\s\S]*?\})?\s*\);/g;
let registration;

while ((registration = registrationPattern.exec(app))) {
  const phases = registration[2]
    ? [...registration[2].matchAll(/["']([^"']+)["']/g)].map((match) => match[1])
    : null;
  registrations.push({ name: registration[1], phases });
}

const names = registrations.map(({ name }) => name);
const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
if (duplicates.length) failures.push(`duplicate lifecycle owner(s): ${[...new Set(duplicates)].join(", ")}`);

for (const required of [
  "input-mode",
  "performance",
  "visual-quality",
  "kpco-logo",
  "lumen-stats",
  "preportal-fluid",
  "magnetic-ui",
  "parallax-depth",
  "audio-reactivity",
]) {
  if (!names.includes(required)) failures.push(`missing lifecycle owner: ${required}`);
}

for (const { name, phases } of registrations) {
  for (const ownerPhase of phases || []) {
    if (!allowedPhases.has(ownerPhase)) failures.push(`${name}: unknown owner phase "${ownerPhase}"`);
  }
}

requireMatch(lifecycle, /\bsnapshot\s*\(\)|function snapshot\s*\(/, "runtime lifecycle has no snapshot");
requireMatch(lifecycle, /kpr-runtime-controller-error/, "runtime lifecycle has no isolated error event");
requireMatch(lifecycle, /suspendReason/, "runtime lifecycle does not expose suspension reason");
requireMatch(app, /runtimeLifecycle\.register\("kpco-logo",\s*kpcoLogoRenderer\)/, "KPCO renderer is not lifecycle-owned");
requireMatch(app, /runtimeLifecycle\.suspend\("document-hidden"\)/, "page hide does not suspend lifecycle");
requireMatch(app, /runtimeLifecycle\.resume\(\)/, "page visibility does not resume lifecycle");
requireMatch(kpco, /function pause\s*\(/, "KPCO renderer has no pause contract");
requireMatch(kpco, /function destroy\s*\(/, "KPCO renderer has no destroy contract");
requireMatch(kpco, /cancelAnimationFrame\(raf\)/, "KPCO renderer does not cancel RAF");
requireMatch(kpco, /clearTimeout\(idleTimer\)/, "KPCO renderer does not cancel idle timer");
requireMatch(kpco, /resume:\s*start/, "KPCO renderer has no resume contract");

for (const expectedPhase of allowedPhases) {
  if (!phase.includes(`"${expectedPhase}"`)) failures.push(`runtime phase director omits "${expectedPhase}"`);
}

const jsFiles = execFileSync("git", ["ls-files", "-z", "*.js"], {
  cwd: root,
  encoding: "buffer",
})
  .toString("utf8")
  .split("\0")
  .filter(Boolean)
  .filter((file) => !file.startsWith("assets/vendor/") && !file.startsWith("node_modules/"));

const loopInventory = jsFiles
  .map((file) => {
    const source = read(file);
    return {
      file,
      requestAnimationFrame: (source.match(/\brequestAnimationFrame\s*\(/g) || []).length,
      setInterval: (source.match(/\bsetInterval\s*\(/g) || []).length,
      setTimeout: (source.match(/\bsetTimeout\s*\(/g) || []).length,
    };
  })
  .filter(({ requestAnimationFrame, setInterval, setTimeout }) => requestAnimationFrame || setInterval || setTimeout);

const report = {
  generatedAt: new Date().toISOString(),
  lifecycleOwners: registrations,
  loopInventory,
  phaseVocabulary: [...allowedPhases],
  status: failures.length ? "failed" : "passed",
  violations: failures,
  version: 254,
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[INFO] ${registrations.length} lifecycle owner(s)`);
console.log(`[INFO] ${loopInventory.length} JavaScript file(s) contain scheduled work`);
console.log(`[INFO] report: ${output}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] runtime ownership v254 contract complete");
