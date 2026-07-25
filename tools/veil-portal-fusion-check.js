const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const appEvents = fs.readFileSync(path.join(root, "modules", "app-events.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");
const fusionCss = fs.readFileSync(path.join(root, "styles", "veil-portal-fusion-v248.css"), "utf8");

const checks = [
  ["reference VEIL lattice restored", /const SP = 28;/.test(appEvents)],
  ["single existing canvas retained", (index.match(/id="veil-grid-canvas"/g) || []).length === 1],
  ["refresh-aware 60-144 Hz adaptation", /Math\.min\(144, peakFps\)/.test(appEvents)],
  ["quality telemetry exposed", /dataset\.veilQuality/.test(appEvents)],
  ["electric arcs preserved", /function spawnArc\(\)/.test(appEvents) && /function drawArc\(arc\)/.test(appEvents)],
  ["reactive node physics preserved", /function pushNodes\(/.test(appEvents)],
  ["sparks and pulses preserved", /function spawnSparks\(/.test(appEvents) && /function spawnPulse\(/.test(appEvents)],
  ["pointer and touch reactions preserved", /addEventListener\('mousemove'/.test(appEvents) && /addEventListener\('touchmove'/.test(appEvents)],
  ["fusion stylesheet connected", /veil-portal-fusion-v248\.css/.test(index)],
  ["VEIL remains beneath portal content", /\.eden-map-stage > \.veil-grid-canvas[\s\S]*z-index: 1/.test(fusionCss)],
  ["no duplicate animation loop introduced", !/requestAnimationFrame/.test(fusionCss)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "[OK]" : "[FAIL]"} ${label}`);
  failed ||= !passed;
}

if (failed) process.exit(1);
console.log("[OK] VEIL portal fusion v248 contract complete");
