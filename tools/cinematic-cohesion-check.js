const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const app = read("app.js");
const events = read("modules/app-events.js");
const fluid = read("modules/preportal-fluid.js");
const story = read("modules/story-mode.js");
const audio = read("modules/audio.js");
const css = read("styles/cinematic-cohesion-v250.css");
const fluidCss = read("styles/preportal-fluid-aaa-v249.css");
const plan = read("docs/MEGA_ULTRA_MASTER_PLAN_v250.md");

const checks = [
  ["original portal canvas retained", /id="eden-portal-canvas"/.test(index)],
  ["original portal GPU retained", /id="eden-portal-gpu"/.test(index)],
  ["no quantum iris DOM reintroduced", !/class="quantum-iris-aperture"/.test(index)],
  ["v250 cohesion stylesheet connected", /cinematic-cohesion-v250\.css/.test(index)],
  ["flat preportal cyan ring removed", !/transparent 0 12%[\s\S]*216, 252, 255/.test(fluidCss)],
  ["spectral threshold aperture present", /thin-film aperture/.test(css) && /rimSpectrum/.test(fluid)],
  ["reference VEIL third octave restored", /nz2\(x \* 4\.3, y \* 4\.3\) \* 0\.1/.test(events)],
  ["reference VEIL optical persistence restored", /globalAlpha = 0\.32/.test(events)],
  ["VEIL rigid eco branch removed", !/const isEcoMode/.test(events)],
  ["portal stage locked to visible viewport", /position: fixed/.test(css) && /height: 100dvh/.test(css)],
  ["native VEIL DPR preserved", /getVeilDpr = \(\) => window\.devicePixelRatio/.test(events)],
  ["settled activation field cached", /lastActivationProgress/.test(events)],
  ["VEIL nodes use batched draw submission", /nodeRenderBuckets/.test(events) && /Canvas2D analogue of instancing/.test(events)],
  ["stale VEIL trail work sleeps", /const activeTrailCount = time - lastInteract < 0\.9 \? trCount : 0/.test(events)],
  ["portrait-blocked simulation gated", /portraitGuardBlocking/.test(events)],
  ["low-latency canvas hint connected", /desynchronized: true/.test(events)],
  ["integrated electricity remains", /cursor electricity belongs to the network/i.test(events)],
  ["WebGL context-loss fallback connected", /webglcontextlost/.test(fluid)],
  ["phase-synchronous audio connected", /crossed\(lastMap, map, 0\.76\)/.test(app)],
  ["cinematic pressure wave connected", /const sub = audioCtx\.createOscillator/.test(audio)],
  ["high-DPI warp speedlines", /speedlineDpr/.test(story)],
  ["no per-particle warp gradient allocation", !/const grad = ctx\.createLinearGradient/.test(story)],
  ["coherent camera shake", /Layered harmonic shake/.test(story)],
  ["reduced-motion flash limiter", /portal-crossing-flash/.test(css)],
  ["cross-platform audit recorded", /DNA molecular demo/.test(plan) && /INVICTVS/.test(plan) && /FRUGAL/.test(plan) && /THESTRAL/.test(plan)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "[OK]" : "[FAIL]"} ${label}`);
  failed ||= !passed;
}
if (failed) process.exit(1);
console.log("[OK] cinematic cohesion v250 contract complete");
