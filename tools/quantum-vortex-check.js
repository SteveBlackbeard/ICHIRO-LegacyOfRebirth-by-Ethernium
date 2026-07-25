const { readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const root = dirname(dirname(__filename));
const read = (file) => readFileSync(join(root, file), "utf8");
const html = read("index.html");
const app = read("app.js");
const moduleCode = read("modules/quantum-vortex-director.js");
const css = read("styles/quantum-vortex-cinematic-v247.css");

const checks = [
  ["cinematic stylesheet connected", html.includes("quantum-vortex-cinematic-v247.css")],
  ["director imported and bound", app.includes("createQuantumVortexDirector") && app.includes("quantumVortexDirector.bind()")],
  ["existing archive timeline consumed", moduleCode.includes("kpr-archive-fold-progress")],
  ["no independent render loop", !moduleCode.includes("requestAnimationFrame") && !moduleCode.includes("setInterval")],
  ["five authored phases", ["dormant", "compression", "singularity", "rupture", "locked"].every((phase) => moduleCode.includes(`\"${phase}\"`))],
  ["adaptive measured quality", moduleCode.includes("frameEma") && moduleCode.includes("data-qv-quality") === false && moduleCode.includes("qvQuality")],
  ["event horizon layers present", ["quantum-vortex-lens", "quantum-vortex-photon-ring", "quantum-vortex-core", "quantum-vortex-shockwave"].every((name) => html.includes(name))],
  ["threshold rupture synchronized", css.includes("html.kpr-portal-entering .quantum-vortex-shockwave")],
  ["balanced fallback preserves choreography", css.includes('[data-qv-quality="balanced"]')],
  ["reduced motion contract", css.includes("@media (prefers-reduced-motion: reduce)")],
  ["production portal video selected", html.includes("portal-transition-production.mp4") && html.includes('preload="metadata"')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`[${passed ? "OK" : "FAIL"}] ${label}`);
  failed ||= !passed;
}
if (failed) process.exit(1);
console.log("[OK] quantum vortex v247 contract complete");
