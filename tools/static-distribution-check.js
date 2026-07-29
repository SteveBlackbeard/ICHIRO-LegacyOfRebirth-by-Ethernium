const {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} = require("node:fs");
const { join, relative, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const config = JSON.parse(
  readFileSync(join(root, "config", "static-distribution.v261.json"), "utf8"),
);
const assetConfig = JSON.parse(
  readFileSync(join(root, "config", "asset-budgets.v253.json"), "utf8"),
);
const output = resolve(root, config.output);
const failures = [];

function walk(directory, files = []) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walk(path, files);
    else files.push(path);
  }
  return files;
}

if (!existsSync(output)) failures.push(`${config.output}: distribution does not exist`);
for (const path of config.requiredFiles) {
  if (!existsSync(join(output, path))) failures.push(`${path}: required deployment file missing`);
}

for (const path of ["config", "docs", "tools", ".github", "node_modules"]) {
  if (existsSync(join(output, path))) failures.push(`${path}: non-runtime directory was deployed`);
}
for (const path of assetConfig.sourceMasters) {
  if (existsSync(join(output, path))) failures.push(`${path}: source master was deployed`);
}

let files = [];
if (existsSync(output)) files = walk(output);
let totalBytes = 0;
for (const absolute of files) {
  const bytes = readFileSync(absolute);
  totalBytes += bytes.length;
  if (
    bytes.length < 1024
    && bytes.toString("utf8").startsWith("version https://git-lfs.github.com/spec/v1")
  ) {
    failures.push(`${relative(output, absolute)}: unresolved LFS pointer`);
  }
}
if (totalBytes > config.maximumBytes) {
  failures.push(`distribution ${totalBytes} bytes exceeds ${config.maximumBytes}`);
}

const manifestPath = join(output, "release-manifest.json");
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.version !== config.version) failures.push("release manifest version mismatch");
  if (manifest.totalBytes <= 0) failures.push("release manifest has no payload");
  if (manifest.fileCount <= 0) failures.push("release manifest has no files");
} else {
  failures.push("release-manifest.json: missing");
}

console.log(`[INFO] ${files.length} deployed file(s)`);
console.log(`[INFO] ${(totalBytes / 1024 / 1024).toFixed(2)} MiB including manifest`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] static distribution v261 contract complete");
