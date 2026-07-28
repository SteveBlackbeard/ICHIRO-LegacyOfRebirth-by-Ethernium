const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { pathToFileURL } = require("node:url");

const root = resolve(__dirname, "..");
const output = join(root, ".artifacts", "dossiers", "dossier-contract-v256.json");

function invalidCandidate(id, solution) {
  if (id === "01") return { gain: 0.1, phase: 0 };
  if (id === "09") return { x: solution.x + 20, y: solution.y + 20 };
  if (id === "06") return ["S", "A", "D", "F"];
  const candidate = [...solution];
  if (typeof candidate[0] === "boolean") candidate[0] = !candidate[0];
  else if (typeof candidate[0] === "number") candidate[0] += 12;
  else candidate[0] = "__INVALID__";
  return candidate;
}

async function main() {
  const failures = [];
  const contracts = await import(pathToFileURL(join(root, "modules", "dossier-contracts.mjs")));
  const archive = await import(pathToFileURL(join(root, "modules", "archive-data.js")));
  const source = readFileSync(join(root, "modules", "dossier-protocols.js"), "utf8");
  const expectedIds = Array.from({ length: 11 }, (_, index) => String(index).padStart(2, "0"));
  const fileIds = archive.files.map(({ id }) => id);

  if (JSON.stringify(fileIds) !== JSON.stringify(expectedIds)) {
    failures.push(`archive IDs are not canonical 00-10: ${fileIds.join(", ")}`);
  }
  if (JSON.stringify(contracts.dossierProtocolIds) !== JSON.stringify(expectedIds)) {
    failures.push("protocol contract IDs differ from archive IDs");
  }

  const validation = {};
  for (const id of expectedIds) {
    const solution = contracts.dossierProtocolSolutions[id];
    const acceptsSolution = contracts.validateDossierProtocol(id, solution);
    const rejectsMutation = !contracts.validateDossierProtocol(id, invalidCandidate(id, solution));
    validation[id] = { acceptsSolution, rejectsMutation };
    if (!acceptsSolution) failures.push(`${id}: canonical solution is rejected`);
    if (!rejectsMutation) failures.push(`${id}: invalid mutation is accepted`);
    if (!source.includes(`validateDossierProtocol("${id}"`)) {
      failures.push(`${id}: runtime does not use shared validator`);
    }
  }

  const fileById = new Map(archive.files.map((file) => [file.id, file]));
  for (const file of archive.files) {
    for (const unlocked of file.unlocks || []) {
      if (!fileById.has(unlocked)) failures.push(`${file.id}: unlocks missing dossier ${unlocked}`);
      if (unlocked === file.id) failures.push(`${file.id}: self-unlock creates a progression cycle`);
    }
  }

  const reachable = new Set(archive.initialUnlocked);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...reachable]) {
      for (const unlocked of fileById.get(id)?.unlocks || []) {
        if (!reachable.has(unlocked)) {
          reachable.add(unlocked);
          changed = true;
        }
      }
    }
  }
  for (const id of expectedIds) {
    if (!reachable.has(id)) failures.push(`${id}: unreachable from initial unlock set`);
  }

  const report = {
    fileIds,
    generatedAt: new Date().toISOString(),
    initialUnlocked: [...archive.initialUnlocked],
    reachable: [...reachable].sort(),
    status: failures.length ? "failed" : "passed",
    validation,
    version: 256,
    violations: failures,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`[INFO] ${fileIds.length} dossier(s), ${reachable.size} reachable`);
  console.log(`[INFO] ${Object.keys(validation).length} deterministic validator(s) exercised`);
  console.log(`[INFO] report: ${output}`);
  for (const failure of failures) console.log(`[FAIL] ${failure}`);
  if (failures.length) process.exit(1);
  console.log("[OK] dossier protocol v256 contract complete");
}

main().catch((error) => {
  console.error(`[FAIL] ${error.stack || error.message}`);
  process.exit(1);
});
