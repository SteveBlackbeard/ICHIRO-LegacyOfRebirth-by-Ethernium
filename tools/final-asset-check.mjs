import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { files } from "../modules/archive-data.js";
import {
  dossierAssetCatalog,
  dossierAssetPolicy,
} from "../modules/dossier-assets.js";
import { publicationAssetCatalog } from "../modules/publication-assets.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = join(
  root,
  ".artifacts",
  "assets",
  "final-asset-readiness-v267.json",
);
const strict = process.argv.includes("--strict")
  || process.env.KPR_REQUIRE_FINAL_ASSETS === "1";
const failures = [];
const warnings = [];
const pending = [];
const approvedSources = new Map();

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: options.encoding || "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function trackedFiles() {
  return new Set(
    git(["ls-files", "-z"])
      .split("\0")
      .filter(Boolean)
      .map((path) => path.replaceAll("\\", "/")),
  );
}

function readAsset(path) {
  const local = join(root, path);
  if (existsSync(local)) return readFileSync(local);
  return git(["show", `:${path}`], { encoding: "buffer" });
}

function assetSize(path) {
  const local = join(root, path);
  if (existsSync(local)) return statSync(local).size;
  return Number(git(["cat-file", "-s", `:${path}`]).trim());
}

function sha256(path) {
  return createHash("sha256").update(readAsset(path)).digest("hex");
}

function validateTrackedAsset(asset, owner, tracked) {
  if (!asset?.src) {
    failures.push(`${owner}: approved asset has no source`);
    return null;
  }
  if (!tracked.has(asset.src)) {
    failures.push(`${owner}: source is not tracked: ${asset.src}`);
    return null;
  }
  const bytes = assetSize(asset.src);
  if (!Number.isFinite(asset.maxBytes) || asset.maxBytes <= 0) {
    failures.push(`${owner}: maxBytes must be a positive number`);
  } else if (bytes > asset.maxBytes) {
    failures.push(`${owner}: ${bytes} bytes exceeds ${asset.maxBytes}`);
  }
  if (!asset.alt?.trim()) failures.push(`${owner}: accessible description is missing`);
  if (!asset.provenance || asset.provenance === "pending") {
    failures.push(`${owner}: approved asset provenance is missing`);
  }
  if (approvedSources.has(asset.src)) {
    failures.push(
      `${owner}: duplicates ${approvedSources.get(asset.src)} at ${asset.src}`,
    );
  } else {
    approvedSources.set(asset.src, owner);
  }
  if (asset.legacyApproved) {
    warnings.push(`${owner}: legacy-approved derivative remains above the new intake target`);
  }
  return {
    id: asset.id,
    path: asset.src,
    bytes,
    maxBytes: asset.maxBytes,
    sha256: sha256(asset.src),
    legacyApproved: Boolean(asset.legacyApproved),
  };
}

function validatePendingAsset(asset, owner) {
  if (asset?.src) failures.push(`${owner}: pending asset must not declare a runtime source`);
  if (!asset?.targetStem?.trim()) failures.push(`${owner}: targetStem is missing`);
  if (!Array.isArray(asset?.allowedExtensions) || !asset.allowedExtensions.length) {
    failures.push(`${owner}: allowedExtensions are missing`);
  }
  if (!Number.isFinite(asset?.maxBytes) || asset.maxBytes <= 0) {
    failures.push(`${owner}: maxBytes must be a positive number`);
  }
  if (!asset?.alt?.trim()) failures.push(`${owner}: asset brief/alt text is missing`);
  pending.push({
    id: asset.id,
    owner,
    targetStem: asset.targetStem,
    allowedExtensions: asset.allowedExtensions,
    maxBytes: asset.maxBytes,
    mediaType: asset.mediaType,
    brief: asset.alt,
  });
}

function validateAsset(asset, owner, tracked) {
  if (!asset || !asset.id) {
    failures.push(`${owner}: asset declaration is missing`);
    return null;
  }
  if (asset.status === dossierAssetPolicy.statuses.APPROVED) {
    return validateTrackedAsset(asset, owner, tracked);
  }
  if (asset.status === dossierAssetPolicy.statuses.PENDING) {
    validatePendingAsset(asset, owner);
    return null;
  }
  failures.push(`${owner}: unsupported status "${asset.status}"`);
  return null;
}

const tracked = trackedFiles();
const fileIds = files.map((file) => file.id);
const catalogIds = Object.keys(dossierAssetCatalog);
const missingCatalogIds = fileIds.filter((id) => !catalogIds.includes(id));
const extraCatalogIds = catalogIds.filter((id) => !fileIds.includes(id));
if (missingCatalogIds.length) {
  failures.push(`catalog missing dossier(s): ${missingCatalogIds.join(", ")}`);
}
if (extraCatalogIds.length) {
  failures.push(`catalog has unknown dossier(s): ${extraCatalogIds.join(", ")}`);
}

const dossiers = [];
for (const file of files) {
  const bundle = dossierAssetCatalog[file.id];
  if (!bundle) continue;
  const approved = [];
  const cover = validateAsset(bundle.cover, `${file.id}.cover`, tracked);
  if (cover) approved.push(cover);

  if (bundle.cover?.fallbackSrc) {
    if (!tracked.has(bundle.cover.fallbackSrc)) {
      failures.push(
        `${file.id}.cover: fallback is not tracked: ${bundle.cover.fallbackSrc}`,
      );
    } else if (extname(bundle.cover.fallbackSrc).toLowerCase() !== ".svg") {
      warnings.push(`${file.id}.cover: pending fallback is expected to remain a light SVG`);
    }
  }

  if (!Array.isArray(bundle.evidence)) {
    failures.push(`${file.id}: evidence declaration must be an array`);
  } else {
    if (bundle.evidence.length !== file.placeholders.length) {
      failures.push(
        `${file.id}: ${bundle.evidence.length} evidence slot(s) for ${file.placeholders.length} narrative slot(s)`,
      );
    }
    bundle.evidence.forEach((asset, index) => {
      const result = validateAsset(asset, `${file.id}.evidence[${index}]`, tracked);
      if (result) approved.push(result);
    });
  }

  const audio = validateAsset(bundle.audio, `${file.id}.audio`, tracked);
  if (audio) approved.push(audio);

  dossiers.push({
    id: file.id,
    title: file.title,
    coverStatus: bundle.cover.status,
    evidenceSlots: file.placeholders.length,
    pendingEvidence: bundle.evidence.filter(
      (asset) => asset.status === dossierAssetPolicy.statuses.PENDING,
    ).length,
    audioStatus: bundle.audio.status,
    approved,
  });
}

const publication = [];
for (const [groupName, group] of Object.entries(publicationAssetCatalog)) {
  for (const [slotName, asset] of Object.entries(group)) {
    const result = validateAsset(
      asset,
      `publication.${groupName}.${slotName}`,
      tracked,
    );
    publication.push({
      group: groupName,
      slot: slotName,
      status: asset.status,
      approved: result,
    });
  }
}

const pendingByType = pending.reduce((summary, asset) => {
  summary[asset.mediaType] = (summary[asset.mediaType] || 0) + 1;
  return summary;
}, {});
const report = {
  schema: 1,
  version: dossierAssetPolicy.version,
  generatedAt: new Date().toISOString(),
  strict,
  runtimeStrategy: dossierAssetPolicy.runtimeStrategy,
  policy: dossierAssetPolicy.newAssetBudgets,
  summary: {
    dossiers: files.length,
    pendingAssets: pending.length,
    pendingByType,
    approvedAssets: approvedSources.size,
    legacyApprovedAssets: dossiers
      .flatMap((dossier) => dossier.approved)
      .filter((asset) => asset.legacyApproved).length,
  },
  dossiers,
  publication,
  pending,
  warnings,
  failures,
};

if (strict && pending.length) {
  failures.push(`${pending.length} required final asset slot(s) remain pending`);
}
report.failures = failures;

mkdirSync(dirname(artifactPath), { recursive: true });
writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`[INFO] ${files.length} dossier contract(s)`);
console.log(`[INFO] ${approvedSources.size} approved runtime asset(s)`);
console.log(`[INFO] ${pending.length} pending final asset slot(s)`);
for (const [type, count] of Object.entries(pendingByType)) {
  console.log(`[INFO] pending ${type}: ${count}`);
}
for (const warning of warnings) console.log(`[WARN] ${warning}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log(`[OK] final asset readiness ${dossierAssetPolicy.version}`);
