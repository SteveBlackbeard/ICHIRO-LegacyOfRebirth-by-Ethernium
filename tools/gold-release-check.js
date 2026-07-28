const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const release = JSON.parse(readFileSync(join(root, "config", "release.v260.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const index = readFileSync(join(root, "index.html"), "utf8");
const publication = readFileSync(join(root, "PUBLICATION_MANIFEST.md"), "utf8");
const e2e = readFileSync(join(root, "tools", "e2e-proof.js"), "utf8");
const license = readFileSync(join(root, "LICENSE.md"), "utf8");
const failures = [];

function ancestor(commit) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], { cwd: root });
    return true;
  } catch {
    return false;
  }
}

if (!ancestor(release.baselineCommit)) failures.push("v250 production baseline is not an ancestor");
for (const commit of release.requiredAncestors) {
  if (!ancestor(commit)) failures.push(`required wave commit is missing: ${commit}`);
}
for (const script of release.requiredScripts) {
  if (!packageJson.scripts?.[script]) failures.push(`required release script is missing: ${script}`);
}
for (const document of release.requiredDocuments) {
  if (!existsSync(join(root, document))) failures.push(`required release document is missing: ${document}`);
}
if (!/The v260 (?:runtime|release candidate)/.test(publication)) {
  failures.push("publication manifest is not promoted to v260");
}
if (!/kpr-v260-gold-rc/.test(index)) failures.push("runtime cache identity is not v260");
if (!/version:\s*"v260"/.test(e2e)) failures.push("browser proof is not identified as v260");
if (/\u00C2\u00A9|\uFFFD/.test(license)) failures.push("license contains encoding corruption");

const deliveryPath = join(root, ".artifacts", "delivery", "release-manifest-v258.json");
let deliveryFingerprint = "";
let deliveryFiles = 0;
if (!existsSync(deliveryPath)) {
  failures.push("secure-delivery manifest has not been generated");
} else {
  const delivery = JSON.parse(readFileSync(deliveryPath, "utf8"));
  deliveryFingerprint = delivery.fingerprint || "";
  deliveryFiles = delivery.fileCount || 0;
  if (!/^[a-f0-9]{64}$/.test(deliveryFingerprint)) failures.push("delivery fingerprint is invalid");
  if (deliveryFiles < 120) failures.push(`delivery manifest is unexpectedly small: ${deliveryFiles}`);
}

const report = {
  schema: "kpr-gold-candidate-report/v1",
  version: "v260",
  candidate: release.candidate,
  targetBranch: release.targetBranch,
  deliveryFingerprint,
  deliveryFiles,
  requiredAncestors: release.requiredAncestors.length,
  violations: failures,
  status: failures.length ? "failed" : "passed",
};
const output = join(root, ".artifacts", "gold", "gold-release-candidate-v260.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[INFO] candidate ${release.candidate}, ${deliveryFiles} delivery file(s)`);
console.log(`[INFO] fingerprint: ${deliveryFingerprint || "missing"}`);
console.log(`[INFO] report: ${output}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] Gold release candidate v260 contract complete");
