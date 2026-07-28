const { existsSync, readFileSync } = require("node:fs");
const { extname, join, normalize, relative, resolve } = require("node:path");
const { execFileSync } = require("node:child_process");

const root = resolve(__dirname, "..");
const failures = [];
const warnings = [];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ps1",
  ".svg",
  ".txt",
  ".yaml",
  ".yml",
]);
const assetExtensions = [
  "avif",
  "gif",
  "glb",
  "gltf",
  "jpeg",
  "jpg",
  "mp3",
  "mp4",
  "ogg",
  "png",
  "svg",
  "wav",
  "webm",
  "webp",
  "woff2",
];
const runtimeSourceExtensions = new Set([".css", ".html", ".js", ".mjs"]);
const decoder = new TextDecoder("utf-8", { fatal: true });

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files", "-z"], {
      cwd: root,
      encoding: "buffer",
    })
      .toString("utf8")
      .split("\0")
      .filter(Boolean)
      .map((file) => file.replaceAll("\\", "/"));
  } catch (error) {
    failures.push(`git ls-files failed: ${error.message}`);
    return [];
  }
}

function readUtf8(file) {
  const absolute = join(root, file);
  try {
    const buffer = existsSync(absolute)
      ? readFileSync(absolute)
      : execFileSync("git", ["show", `:${file}`], {
          cwd: root,
          encoding: "buffer",
          maxBuffer: 32 * 1024 * 1024,
        });
    return decoder.decode(buffer);
  } catch (error) {
    const reason = error?.code === "ERR_ENCODING_INVALID_ENCODED_DATA"
      ? "invalid UTF-8"
      : "cannot be read from the working tree or Git index";
    failures.push(`${file}: ${reason}`);
    return "";
  }
}

function normalizeAssetReference(reference) {
  let output = reference.replaceAll("\\", "/").replace(/^\.?\//, "");
  try {
    output = decodeURIComponent(output);
  } catch {
    failures.push(`${reference}: malformed percent-encoded asset path`);
  }
  return normalize(output).replaceAll("\\", "/");
}

const tracked = trackedFiles();
const trackedSet = new Set(tracked);
const textFiles = tracked.filter((file) => textExtensions.has(extname(file).toLowerCase()));
const textByFile = new Map();

for (const file of textFiles) {
  const text = readUtf8(file);
  textByFile.set(file, text);
  if (text.includes("\uFFFD")) failures.push(`${file}: contains a Unicode replacement character`);
  if (/\u00E2\u20AC[\u2010-\u203A]/u.test(text)) {
    failures.push(`${file}: contains a likely UTF-8/Windows-1252 mojibake sequence`);
  }
  if (/\u00C3[\u0080-\u00BF]|\u00C2[\u0080-\u00BF]/u.test(text)) {
    failures.push(`${file}: contains a likely double-decoded UTF-8 sequence`);
  }
}

const forbiddenTrackedPaths = [
  /(^|\/)node_modules(\/|$)/i,
  /(^|\/)scratch(\/|$)/i,
  /(^|\/)exports(\/|$)/i,
  /(^|\/)backups?(\/|$)/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(?:^|\/)(?:server.*|portal-transcode.*)\.(?:log|out|err)$/i,
];
for (const file of tracked) {
  if (forbiddenTrackedPaths.some((pattern) => pattern.test(file))) {
    failures.push(`${file}: generated, private, or workspace-only path is tracked`);
  }
}

const referenceOwners = new Map();
const quotedAssetPattern = new RegExp(
  `["'\`](assets/[^"'\\\`\\r\\n]+?\\.(?:${assetExtensions.join("|")}))(?:[?#][^"'\\\`]*)?["'\`]`,
  "gi",
);
const unquotedCssAssetPattern = new RegExp(
  `url\\(\\s*(assets/[^)\\s]+?\\.(?:${assetExtensions.join("|")}))(?:[?#][^)]*)?\\s*\\)`,
  "gi",
);

for (const [file, text] of textByFile) {
  if (!runtimeSourceExtensions.has(extname(file).toLowerCase())) continue;
  if (file.startsWith("assets/vendor/")) continue;
  for (const pattern of [quotedAssetPattern, unquotedCssAssetPattern]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text))) {
      const reference = normalizeAssetReference(match[1]);
      if (reference.includes("${")) {
        warnings.push(`${file}: dynamic asset reference requires runtime coverage: ${reference}`);
        continue;
      }
      if (!referenceOwners.has(reference)) referenceOwners.set(reference, new Set());
      referenceOwners.get(reference).add(file);
    }
  }
}

for (const [reference, owners] of referenceOwners) {
  const absolute = resolve(root, reference);
  const relativePath = relative(root, absolute);
  if (relativePath.startsWith("..") || relativePath.includes(`..${require("node:path").sep}`)) {
    failures.push(`${[...owners].join(", ")}: asset escapes repository root: ${reference}`);
  } else if (!trackedSet.has(reference)) {
    failures.push(`${[...owners].join(", ")}: referenced asset is not tracked: ${reference}`);
  }
}

const trackedAssets = tracked.filter((file) => file.startsWith("assets/"));
const unreferencedAssets = trackedAssets.filter((file) => !referenceOwners.has(file));
if (unreferencedAssets.length) {
  warnings.push(`${unreferencedAssets.length} tracked asset(s) are not statically referenced`);
}

const packageJson = JSON.parse(readUtf8("package.json"));
const scripts = packageJson.scripts || {};
const requiredScripts = [
  "check",
  "test",
  "test:integrity",
  "test:assets",
  "test:runtime",
  "test:visual",
  "test:veil",
  "test:entry",
  "test:transmission",
  "test:cinema",
];
for (const script of requiredScripts) {
  if (!scripts[script]) failures.push(`package.json: missing required script "${script}"`);
}
for (const script of requiredScripts.filter((name) => name !== "test")) {
  if (scripts.test && !scripts.test.includes(`npm run ${script}`)) {
    failures.push(`package.json: canonical test gate does not include "${script}"`);
  }
}

for (const workflow of tracked.filter((file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file))) {
  const text = textByFile.get(workflow) || readUtf8(workflow);
  if (/\bnpm test\b/.test(text) && !scripts.test) {
    failures.push(`${workflow}: runs npm test but package.json has no test script`);
  }
  for (const match of text.matchAll(/\bnpm run ([A-Za-z0-9:_-]+)/g)) {
    if (!scripts[match[1]]) failures.push(`${workflow}: references missing npm script "${match[1]}"`);
  }
}

for (const required of [
  "README.md",
  "LICENSE.md",
  "SECURITY.md",
  "PUBLICATION_MANIFEST.md",
  ".gitignore",
  ".gitattributes",
  "assets/video/portal-transition-production.mp4",
  "assets/video/designation-silent-sentinel-budget.mp4",
  "assets/models/yatagarasu-blueprint-quant.glb",
]) {
  if (!trackedSet.has(required)) failures.push(`${required}: required public file is not tracked`);
}

const attributes = textByFile.get(".gitattributes") || readUtf8(".gitattributes");
for (const lfsPattern of [
  "YATAGARASU[[:space:]]BASE[[:space:]]LOW.glb",
  "yatagarasu-blueprint-budget.glb",
  "designation-silent-sentinel.mp4",
  "portal-transition.mp4",
  "grok-transition.mp4",
]) {
  if (!attributes.includes(lfsPattern) || !attributes.includes("filter=lfs")) {
    failures.push(`.gitattributes: missing LFS contract for ${lfsPattern}`);
  }
}

const index = textByFile.get("index.html") || readUtf8("index.html");
const appCacheVersion = Number(index.match(/src="app\.js\?v=kpr-v(\d+)/)?.[1] || 0);
const styleCacheVersion = Number(index.match(/href="styles\.css\?v=kpr-v(\d+)/)?.[1] || 0);
const manifest = textByFile.get("PUBLICATION_MANIFEST.md") || readUtf8("PUBLICATION_MANIFEST.md");
const manifestVersion = Number(manifest.match(/\bv(\d+) runtime\b/i)?.[1] || 0);

if (!manifestVersion) failures.push("PUBLICATION_MANIFEST.md: runtime version is missing");
for (const [label, version] of [
  ["app.js cache", appCacheVersion],
  ["styles.css cache", styleCacheVersion],
]) {
  if (version < manifestVersion) {
    failures.push(`${label}: v${version || "missing"} is behind public runtime v${manifestVersion}`);
  }
}

console.log(`[INFO] ${tracked.length} tracked file(s)`);
console.log(`[INFO] ${textFiles.length} UTF-8 text file(s) validated`);
console.log(`[INFO] ${referenceOwners.size} static asset reference(s) validated`);
console.log(`[INFO] ${trackedAssets.length} tracked asset(s)`);
console.log(`[INFO] public runtime baseline v${manifestVersion || "missing"}`);
for (const warning of warnings.slice(0, 12)) console.log(`[WARN] ${warning}`);
if (warnings.length > 12) console.log(`[WARN] ${warnings.length - 12} additional warning(s) omitted`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] repository integrity v251 contract complete");
