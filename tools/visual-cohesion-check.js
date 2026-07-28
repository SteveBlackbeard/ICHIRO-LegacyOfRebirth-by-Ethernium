const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const config = JSON.parse(readFileSync(join(root, "config", "optical-grammar.v255.json"), "utf8"));
const index = readFileSync(join(root, "index.html"), "utf8");
const tokens = readFileSync(join(root, "styles", "tokens.css"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const failures = [];

const metrics = {
  important: (css.match(/!important/g) || []).length,
  keyframes: (css.match(/@keyframes\s+/g) || []).length,
  filterDeclarations: (css.match(/(?:^|[;{]\s*)filter\s*:/gm) || []).length,
  backdropFilterDeclarations: (css.match(/backdrop-filter\s*:/g) || []).length,
  boxShadowDeclarations: (css.match(/box-shadow\s*:/g) || []).length,
  textShadowDeclarations: (css.match(/text-shadow\s*:/g) || []).length,
};

for (const token of config.requiredTokens) {
  if (!tokens.includes(`${token}:`)) failures.push(`missing optical token: ${token}`);
}

const linkedStyles = [...index.matchAll(/href="([^"]+\.css)(?:\?[^"]*)?"/g)].map((match) => match[1]);
const declaredStyles = config.stylesheetOrder;
if (JSON.stringify(linkedStyles) !== JSON.stringify(declaredStyles)) {
  failures.push(`stylesheet order differs: ${linkedStyles.join(" -> ")}`);
}

for (const [metric, ceiling] of Object.entries(config.complexityCeilings)) {
  if (metrics[metric] > ceiling) failures.push(`${metric}: ${metrics[metric]} exceeds frozen ceiling ${ceiling}`);
}

for (const selector of config.primarySilhouettes) {
  const present = index.includes(selector.replace(/^[.#]/, ""))
    || css.includes(selector);
  if (!present) failures.push(`primary silhouette is not represented: ${selector}`);
}

const report = {
  complexityCeilings: config.complexityCeilings,
  generatedAt: new Date().toISOString(),
  metrics,
  primarySilhouettes: config.primarySilhouettes,
  status: failures.length ? "failed" : "passed",
  stylesheetOrder: linkedStyles,
  violations: failures,
  version: config.version,
};
const output = join(root, ".artifacts", "visual", "visual-cohesion-v255.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[INFO] CSS complexity ${JSON.stringify(metrics)}`);
console.log(`[INFO] ${config.primarySilhouettes.length} primary silhouette(s) governed`);
console.log(`[INFO] report: ${output}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] visual cohesion v255 contract complete");
