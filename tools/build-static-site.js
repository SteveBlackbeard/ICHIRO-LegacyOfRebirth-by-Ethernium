const {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { execFileSync } = require("node:child_process");
const { createHash } = require("node:crypto");
const { dirname, extname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const distributionConfig = JSON.parse(
  readFileSync(join(root, "config", "static-distribution.v261.json"), "utf8"),
);
const assetConfig = JSON.parse(
  readFileSync(join(root, "config", "asset-budgets.v253.json"), "utf8"),
);
const output = resolve(root, distributionConfig.output);
const sourceExtensions = new Set([".css", ".html", ".js", ".mjs"]);
const assetExtensions = [
  "avif", "gif", "glb", "gltf", "jpeg", "jpg", "js", "mjs", "mp3", "mp4",
  "ogg", "otf", "png", "svg", "txt", "vtt", "wav", "webm", "webp", "woff2",
];

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: options.encoding || "utf8",
    input: options.input,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function trackedFiles() {
  return git(["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .map((path) => path.replaceAll("\\", "/"));
}

function readTracked(path) {
  const local = join(root, path);
  if (existsSync(local)) return readFileSync(local);
  return git(["show", `:${path}`], { encoding: "buffer" });
}

function copyTracked(path) {
  const destination = join(output, path);
  mkdirSync(dirname(destination), { recursive: true });
  const local = join(root, path);
  if (existsSync(local)) {
    copyFileSync(local, destination);
    return;
  }
  const outputDescriptor = openSync(destination, "w");
  try {
    execFileSync("git", ["show", `:${path}`], {
      cwd: root,
      stdio: ["ignore", outputDescriptor, "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    });
  } finally {
    closeSync(outputDescriptor);
  }
}

function referencedAssets(paths) {
  const references = new Set();
  const quoted = new RegExp(
    `["'\`](?:\\.?\\/)?(assets\\/[^"'\\\`\\r\\n?#]+?\\.(?:${assetExtensions.join("|")}))(?:[?#][^"'\\\`]*)?["'\`]`,
    "gi",
  );
  const css = new RegExp(
    `url\\(\\s*["']?(?:\\.?\\/)?(assets\\/[^)"'\\s?#]+?\\.(?:${assetExtensions.join("|")}))(?:[?#][^)"']*)?["']?\\s*\\)`,
    "gi",
  );
  for (const path of paths) {
    if (!sourceExtensions.has(extname(path).toLowerCase())) continue;
    const text = readTracked(path).toString("utf8");
    for (const matcher of [quoted, css]) {
      matcher.lastIndex = 0;
      let match;
      while ((match = matcher.exec(text))) references.add(match[1].replaceAll("\\", "/"));
    }
  }
  return references;
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function isLfsPointer(path) {
  const bytes = readFileSync(path);
  return bytes.length < 1024
    && bytes.toString("utf8").startsWith("version https://git-lfs.github.com/spec/v1");
}

const tracked = trackedFiles();
const trackedSet = new Set(tracked);
const runtimeSources = new Set(distributionConfig.entryFiles);
for (const directory of distributionConfig.sourceDirectories) {
  for (const path of tracked) {
    if (path.startsWith(`${directory}/`)) runtimeSources.add(path);
  }
}

const assetReferences = referencedAssets([...runtimeSources]);
for (const phase of Object.values(assetConfig.phaseBudgets)) {
  for (const path of phase.assets) assetReferences.add(path);
}
for (const entry of assetConfig.requiredProduction) assetReferences.add(entry.path);

const excluded = new Set(
  distributionConfig.excludedAssetProfiles.flatMap((profile) => assetConfig[profile] || []),
);
const missing = [...runtimeSources, ...assetReferences]
  .filter((path) => !excluded.has(path))
  .filter((path) => !trackedSet.has(path));
if (missing.length) {
  throw new Error(`Static distribution references untracked files:\n${missing.join("\n")}`);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const path of runtimeSources) copyTracked(path);
for (const path of assetReferences) {
  if (!excluded.has(path)) copyTracked(path);
}
writeFileSync(join(output, ".nojekyll"), "", "utf8");

const copied = [...runtimeSources, ...assetReferences]
  .filter((path) => !excluded.has(path))
  .sort();
const files = copied.map((path) => {
  const absolute = join(output, path);
  if (isLfsPointer(absolute)) {
    throw new Error(`${path}: LFS pointer reached the static distribution`);
  }
  return {
    path,
    bytes: statSync(absolute).size,
    sha256: sha256(absolute),
  };
});
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
if (totalBytes > distributionConfig.maximumBytes) {
  throw new Error(
    `Static distribution is ${totalBytes} bytes; budget is ${distributionConfig.maximumBytes}`,
  );
}

const commit = git(["rev-parse", "HEAD"]).trim();
const manifest = {
  schema: 1,
  version: distributionConfig.version,
  packageVersion: require(join(root, "package.json")).version,
  commit,
  generatedAt: new Date().toISOString(),
  totalBytes,
  fileCount: files.length,
  excludedSourceMasters: [...excluded].sort(),
  files,
};
writeFileSync(
  join(output, "release-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);

console.log(`[OK] static distribution ${distributionConfig.version}`);
console.log(`[INFO] ${files.length} runtime file(s)`);
console.log(`[INFO] ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
console.log(`[INFO] commit ${commit}`);
