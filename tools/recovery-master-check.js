const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const app = read("app.js");
const story = read("modules/story-mode.js");
const warp = read("modules/portal-warp.js");
const events = read("modules/app-events.js");
const fluid = read("modules/preportal-fluid.js");
const css = read("styles/recovery-master-v251.css");
const plan = read("docs/MEGA_ULTRA_MASTER_PLAN_v251.md");

const checks = [
  ["v251 release marker connected", /data-kpr-release="v251"/.test(index)],
  ["v251 cache boundary connected", /kpr-v251-recovery-master/.test(index) && /kpr-v251-recovery-master/.test(app)],
  ["recovery stylesheet connected", /recovery-master-v251\.css/.test(index) && /maximum-fidelity warp\/HUD cohesion/.test(css)],
  ["production crossing retained", /portal-transition-production\.mp4/.test(index) && /preload="metadata"/.test(index)],
  ["crossing asset warms near portal", /detail\?\.map \|\| 0\) < 0\.52/.test(story) && /transitionVideo\.preload = "auto"/.test(story)],
  ["speedline canvas connected", /id="portal-warp-speedlines-canvas"/.test(index) && /display: block !important/.test(css)],
  ["HUD telemetry connected", /id="hud-coord-x"/.test(index) && /id="hud-coord-y"/.test(index)],
  ["adaptive density preserves ultra", /ultra: \{ particles: 160000, streaks: 35000/.test(warp) && /qualityTier/.test(warp)],
  ["high-performance GPU requested", /powerPreference: "high-performance"/.test(warp)],
  ["WebGL attributes cached", /particleDataAttrib = gl\.getAttribLocation/.test(warp) && !/const aDataPart = gl\.getAttribLocation/.test(warp)],
  ["warp lifecycle guarded", /webglcontextlost/.test(warp) && /visibilitychange/.test(warp) && /document\.hidden/.test(warp)],
  ["speedline trigonometry cached", /particle\.cosA = Math\.cos/.test(story) && /const cosA = p\.cosA/.test(story)],
  ["HUD log updates are state-gated", /lastLogCount/.test(story)],
  ["harmonic camera retained", /Layered harmonic shake/.test(story)],
  ["per-particle gradients remain eliminated", !/createLinearGradient/.test(story)],
  ["VEIL batching retained", /nodeRenderBuckets/.test(events) && /activeTrailCount/.test(events)],
  ["original portal remains distinct", /id="eden-portal-canvas"/.test(index) && /id="eden-portal-gpu"/.test(index)],
  ["spectral fluid phase retained", /initPreportalFluid/.test(app) && /rimSpectrum/.test(fluid)],
  ["mobile landscape guard retained", /mobile-landscape-guard-v246\.css/.test(index)],
  ["recovery decisions documented", /recovered tree remains untouched/.test(plan) && /Definition of done/.test(plan)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "[OK]" : "[FAIL]"} ${label}`);
  failed ||= !passed;
}
if (failed) process.exit(1);
console.log("[OK] recovery master v251 contract complete");
