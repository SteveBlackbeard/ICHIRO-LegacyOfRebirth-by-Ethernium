const { createHash } = require("node:crypto");
const { execFileSync, spawn } = require("node:child_process");
const { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { dirname, join, relative, resolve, sep } = require("node:path");

const root = resolve(__dirname, "..");
const runtimeExtensions = /\.(?:html|css|js|mjs|json)$/i;
const assetPattern = /assets\/[A-Za-z0-9_./%()+\- ]+\.(?:avif|gif|glb|ico|js|jpe?g|json|mjs|mp3|mp4|png|svg|txt|webm|webp|woff2)/gi;
const trackedFiles = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
const sourceFiles = trackedFiles
  .filter((file) => runtimeExtensions.test(file))
  .filter((file) => !file.startsWith("assets/"))
  .filter((file) => !file.startsWith(".artifacts/"));

const releaseFiles = new Set([
  "package.json",
  "package-lock.json",
  "server.js",
  ...trackedFiles.filter((file) => file.startsWith("assets/vendor/") && /\.(?:js|mjs)$/i.test(file)),
  ...sourceFiles.filter((file) => (
    file === "index.html"
    || file === "styles.css"
    || file.startsWith("styles/")
    || file === "app.js"
    || file === "activation-3d.js"
    || file === "archive-3d.js"
    || file.startsWith("modules/")
    || file.startsWith("config/")
  )),
]);

for (const source of sourceFiles) {
  const text = readFileSync(join(root, source), "utf8");
  for (const match of text.matchAll(assetPattern)) {
    const asset = decodeURIComponent(match[0]).replaceAll("\\", "/");
    releaseFiles.add(asset);
  }
}

function normalize(file) {
  return relative(root, file).split(sep).join("/");
}

function lfsIdentity(buffer) {
  if (buffer.length > 512) return null;
  const text = buffer.toString("utf8");
  const oid = text.match(/^oid sha256:([a-f0-9]{64})$/m)?.[1];
  const bytes = Number(text.match(/^size (\d+)$/m)?.[1]);
  return oid && Number.isFinite(bytes)
    ? { bytes, digest: oid, identity: "git-lfs-sha256" }
    : null;
}

function hashFile(file) {
  const lfs = lfsIdentity(readFileSync(file));
  if (lfs) return Promise.resolve(lfs);
  return new Promise((resolveHash, rejectHash) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", rejectHash);
    stream.on("end", () => resolveHash({
      bytes: statSync(file).size,
      digest: hash.digest("hex"),
      identity: "content-sha256",
    }));
  });
}

function hashIndexBlob(pathName) {
  return new Promise((resolveHash, rejectHash) => {
    const child = spawn("git", ["show", `:${pathName}`], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const hash = createHash("sha256");
    const prefix = [];
    let prefixBytes = 0;
    let bytes = 0;
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      bytes += chunk.length;
      hash.update(chunk);
      if (prefixBytes <= 512) {
        const remaining = 513 - prefixBytes;
        if (remaining > 0) {
          const slice = chunk.subarray(0, remaining);
          prefix.push(slice);
          prefixBytes += slice.length;
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectHash);
    child.on("close", (code) => {
      if (code !== 0) {
        rejectHash(new Error(`git show failed for ${pathName}: ${stderr.trim() || `exit ${code}`}`));
        return;
      }
      const lfs = bytes <= 512 ? lfsIdentity(Buffer.concat(prefix, prefixBytes)) : null;
      resolveHash(lfs || {
        bytes,
        digest: hash.digest("hex"),
        identity: "git-index-sha256",
      });
    });
  });
}

async function main() {
  const entries = [];
  for (const pathName of [...releaseFiles].sort()) {
    const absolute = join(root, pathName);
    const identity = existsSync(absolute)
      ? await hashFile(absolute)
      : await hashIndexBlob(pathName);
    entries.push({ path: normalize(absolute), ...identity });
  }
  const fingerprint = createHash("sha256");
  for (const entry of entries) {
    fingerprint.update(`${entry.path}\0${entry.digest}\0${entry.bytes}\0${entry.identity}\n`);
  }
  const manifest = {
    schema: "kpr-release-manifest/v1",
    version: "v258",
    baseline: "v257",
    algorithm: "sha256",
    fingerprint: fingerprint.digest("hex"),
    fileCount: entries.length,
    files: entries,
  };
  const output = join(root, ".artifacts", "delivery", "release-manifest-v258.json");
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[INFO] ${entries.length} release file(s) fingerprinted`);
  console.log(`[INFO] fingerprint: ${manifest.fingerprint}`);
  console.log(`[INFO] manifest: ${output}`);
  console.log("[OK] release manifest v258 complete");
}

main().catch((error) => {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
});
