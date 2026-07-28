const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
const policy = JSON.parse(readFileSync(join(root, "config", "delivery-policy.v258.json"), "utf8"));
const failures = [];

const topLevel = Object.entries(packageJson.dependencies || {});
for (const [name, version] of topLevel) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    failures.push(`${name} is not pinned to an exact version: ${version}`);
  }
  if (lock.packages?.[""]?.dependencies?.[name] !== version) {
    failures.push(`${name} differs between package.json and package-lock.json`);
  }
}

const packages = Object.entries(lock.packages || {}).filter(([name]) => name);
const licenses = new Set();
for (const [name, metadata] of packages) {
  if (!metadata.integrity || !/^sha512-[A-Za-z0-9+/=]+$/.test(metadata.integrity)) {
    failures.push(`${name} has no valid sha512 integrity`);
  }
  if (!metadata.resolved || !metadata.resolved.startsWith("https://registry.npmjs.org/")) {
    failures.push(`${name} is not resolved from the HTTPS npm registry`);
  }
  const license = metadata.license || "UNKNOWN";
  licenses.add(license);
  if (!policy.dependencyPolicy.allowedLicenses.includes(license)) {
    failures.push(`${name} uses an unapproved license: ${license}`);
  }
  for (const blocked of policy.dependencyPolicy.blockedProtocols) {
    if (metadata.resolved?.startsWith(blocked)) {
      failures.push(`${name} uses blocked dependency protocol ${blocked}`);
    }
  }
}

const report = {
  version: "v258",
  dependencyCount: packages.length,
  directDependencies: Object.fromEntries(topLevel),
  licenses: [...licenses].sort(),
  violations: failures,
  status: failures.length ? "failed" : "passed",
};
const output = join(root, ".artifacts", "delivery", "supply-chain-v258.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[INFO] ${packages.length} locked package(s), ${licenses.size} license family/families`);
console.log(`[INFO] report: ${output}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] supply-chain v258 contract complete");
