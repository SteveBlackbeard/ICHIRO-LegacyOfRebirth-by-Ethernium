const {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { execFileSync } = require("node:child_process");
const { dirname, extname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const fallbackRoot = process.env.KPR_ASSET_ROOT
  ? resolve(process.env.KPR_ASSET_ROOT)
  : null;
const configPath = join(root, "config", "asset-budgets.v253.json");
const artifactPath = join(root, ".artifacts", "assets", "asset-report-v253.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const failures = [];
const warnings = [];
const decoder = new TextDecoder("utf-8", { fatal: true });
const assetExtensions = new Set([
  ".avif",
  ".gif",
  ".glb",
  ".gltf",
  ".jpeg",
  ".jpg",
  ".js",
  ".mjs",
  ".mp3",
  ".mp4",
  ".ogg",
  ".otf",
  ".png",
  ".svg",
  ".txt",
  ".wav",
  ".webm",
  ".webp",
  ".woff2",
]);
const sourceExtensions = new Set([".css", ".html", ".js", ".mjs"]);

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

function readTrackedText(path) {
  const local = join(root, path);
  try {
    const bytes = existsSync(local)
      ? readFileSync(local)
      : git(["show", `:${path}`], { encoding: "buffer" });
    return decoder.decode(bytes);
  } catch (error) {
    failures.push(`${path}: cannot read tracked UTF-8 source (${error.message})`);
    return "";
  }
}

function resolveAsset(path) {
  const primary = join(root, path);
  if (existsSync(primary)) return { path: primary, source: "working-tree" };
  if (fallbackRoot) {
    const fallback = join(fallbackRoot, path);
    if (existsSync(fallback)) return { path: fallback, source: "fallback-root" };
  }
  return null;
}

function parseLfsPointer(text) {
  if (!text.startsWith("version https://git-lfs.github.com/spec/v1")) return null;
  const size = Number(text.match(/^size (\d+)$/m)?.[1] || 0);
  const oid = text.match(/^oid sha256:([a-f0-9]+)$/m)?.[1] || "";
  return size > 0 ? { size, oid } : null;
}

function assetMeasurement(path) {
  const resolvedAsset = resolveAsset(path);
  if (resolvedAsset) {
    const stat = statSync(resolvedAsset.path);
    if (stat.size <= 1024) {
      const pointer = parseLfsPointer(readFileSync(resolvedAsset.path, "utf8"));
      if (pointer) {
        return {
          bytes: pointer.size,
          storageBytes: stat.size,
          source: `${resolvedAsset.source}-lfs-pointer`,
          lfsOid: pointer.oid,
        };
      }
    }
    return { bytes: stat.size, storageBytes: stat.size, source: resolvedAsset.source };
  }

  try {
    const storageBytes = Number(git(["cat-file", "-s", `:${path}`]).trim());
    if (storageBytes <= 1024) {
      const pointer = parseLfsPointer(git(["show", `:${path}`]));
      if (pointer) {
        return {
          bytes: pointer.size,
          storageBytes,
          source: "git-index-lfs-pointer",
          lfsOid: pointer.oid,
        };
      }
    }
    return { bytes: storageBytes, storageBytes, source: "git-index" };
  } catch (error) {
    failures.push(`${path}: size is unavailable (${error.message})`);
    return { bytes: 0, storageBytes: 0, source: "missing" };
  }
}

function assetAttributes(paths) {
  if (!paths.length) return new Map();
  const output = git(["check-attr", "-z", "--stdin", "filter"], {
    input: `${paths.join("\0")}\0`,
  }).split("\0");
  const attributes = new Map();
  for (let index = 0; index + 2 < output.length; index += 3) {
    attributes.set(output[index], output[index + 2]);
  }
  return attributes;
}

function referencedAssets(sourceFiles) {
  const owners = new Map();
  const pattern = /["'`](?:\.?\/)?(assets\/[^"'`\r\n?#]+?\.(?:avif|gif|glb|gltf|jpeg|jpg|js|mjs|mp3|mp4|ogg|otf|png|svg|txt|wav|webm|webp|woff2))(?:[?#][^"'`]*)?["'`]/gi;
  const cssPattern = /url\(\s*["']?(?:\.?\/)?(assets\/[^)"'\s?#]+?\.(?:avif|gif|glb|gltf|jpeg|jpg|js|mjs|mp3|mp4|ogg|otf|png|svg|txt|wav|webm|webp|woff2))(?:[?#][^)"']*)?["']?\s*\)/gi;
  for (const path of sourceFiles) {
    const text = readTrackedText(path);
    for (const matcher of [pattern, cssPattern]) {
      matcher.lastIndex = 0;
      let match;
      while ((match = matcher.exec(text))) {
        const asset = match[1].replaceAll("\\", "/");
        if (!owners.has(asset)) owners.set(asset, new Set());
        owners.get(asset).add(path);
      }
    }
  }
  return owners;
}

function formatMiB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

const tracked = trackedFiles();
const trackedSet = new Set(tracked);
const trackedAssets = tracked.filter(
  (path) => path.startsWith("assets/") && assetExtensions.has(extname(path).toLowerCase()),
);
const sourceFiles = tracked.filter(
  (path) => sourceExtensions.has(extname(path).toLowerCase())
    && !path.startsWith("assets/vendor/")
    && !path.startsWith("docs/")
    && !path.startsWith("tools/")
    && !path.startsWith(".github/"),
);
const owners = referencedAssets(sourceFiles);
const governedPaths = new Set([
  ...config.requiredProduction.map((entry) => entry.path),
  ...config.sourceMasters,
  ...Object.values(config.phaseBudgets).flatMap((phase) => phase.assets),
]);

for (const path of governedPaths) {
  if (!trackedSet.has(path)) failures.push(`${path}: governed asset is not tracked`);
}
for (const path of owners.keys()) {
  if (!trackedSet.has(path)) failures.push(`${path}: runtime reference is not tracked`);
}

const measurements = new Map();
for (const path of governedPaths) {
  if (trackedSet.has(path)) measurements.set(path, assetMeasurement(path));
}
const attributes = assetAttributes([...governedPaths].filter((path) => trackedSet.has(path)));

const production = config.requiredProduction.map((entry) => {
  const measurement = measurements.get(entry.path) || { bytes: 0, source: "missing" };
  if (measurement.bytes > entry.maxBytes) {
    failures.push(
      `${entry.path}: ${formatMiB(measurement.bytes)} exceeds ${formatMiB(entry.maxBytes)}`,
    );
  }
  if (attributes.get(entry.path) === "lfs") {
    failures.push(`${entry.path}: production derivative must be a normal Git blob, not LFS`);
  }
  return { ...entry, ...measurement };
});

const masters = config.sourceMasters.map((path) => {
  const measurement = measurements.get(path) || { bytes: 0, source: "missing" };
  if (attributes.get(path) !== "lfs") {
    failures.push(`${path}: source master must use Git LFS`);
  }
  return { path, ...measurement };
});

const phases = Object.entries(config.phaseBudgets).map(([name, phase]) => {
  const assets = phase.assets.map((path) => ({
    path,
    ...(measurements.get(path) || { bytes: 0, source: "missing" }),
  }));
  const bytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  if (bytes > phase.maxBytes) {
    failures.push(`${name}: ${formatMiB(bytes)} exceeds ${formatMiB(phase.maxBytes)}`);
  }
  return { name, bytes, maxBytes: phase.maxBytes, assets };
});

const unreferenced = trackedAssets.filter((path) => !owners.has(path));
if (unreferenced.length) {
  warnings.push(`${unreferenced.length} tracked asset(s) are not statically referenced`);
}

const report = {
  version: config.version,
  generatedAt: new Date().toISOString(),
  trackedAssets: trackedAssets.length,
  referencedAssets: owners.size,
  unreferencedAssets: unreferenced.length,
  fallbackRootUsed: Boolean(fallbackRoot),
  production,
  sourceMasters: masters,
  phases,
  approvedDuplicates: config.approvedDuplicates,
  warnings,
  failures,
};

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`[INFO] ${trackedAssets.length} tracked asset(s)`);
console.log(`[INFO] ${owners.size} statically referenced runtime asset(s)`);
for (const phase of phases) {
  console.log(`[OK] ${phase.name}: ${formatMiB(phase.bytes)} / ${formatMiB(phase.maxBytes)}`);
}
for (const entry of production) {
  console.log(`[OK] ${entry.path}: ${formatMiB(entry.bytes)} / ${formatMiB(entry.maxBytes)}`);
}
for (const warning of warnings) console.log(`[WARN] ${warning}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] asset governance v253 contract complete");
