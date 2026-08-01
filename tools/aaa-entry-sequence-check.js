const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const index = read("index.html");
const app = read("app.js");
const particles = read("modules/particles.js");
const fluid = read("modules/preportal-fluid.js");
const fluidCss = read("styles/preportal-fluid-aaa-v249.css");
const landscapeCss = read("styles/mobile-landscape-guard-v246.css");

const checks = [
  ["legacy portal canvas retained", /id="eden-portal-canvas"/.test(index)],
  ["added quantum iris removed from portal", !/quantum-iris-aperture/.test(index)],
  ["preportal fluid is a separate layer", /id="preportal-fluid-canvas"/.test(index)],
  ["preportal stylesheet connected", /preportal-fluid-aaa-v249\.css/.test(index)],
  ["preportal module connected", /initPreportalFluid/.test(app)],
  ["meteor module cache key updated", /particles\.js\?v=kpr-v249-entry-meteors/.test(app)],
  ["GPU fluid uses WebGL2", /getContext\("webgl2"/.test(fluid)],
  ["fluid has five-octave noise", /octave < 5/.test(fluid)],
  ["fluid has spectral thin-film color", /thinFilm/.test(fluid) && /wavelengths/.test(fluid)],
  ["fluid reacts to pointer velocity", /u_pointerVelocity/.test(fluid) && /pointermove/.test(fluid)],
  ["fluid is limited to anticipation window", /smoothstep\(0\.72, 0\.94, u_progress\)/.test(fluid)],
  ["original portal stays above anticipation", /z-index: 8/.test(fluidCss)],
  ["meteor cadence supports high refresh", /return 8\.2/.test(particles)],
  ["meteors have atmospheric plume", /dot\.width \* 5\.8/.test(particles)],
  ["meteors have incandescent heads", /rgba\(255, 251, 226/.test(particles)],
  ["meteors have breakup fragments", /dot\.breakup/.test(particles) && /fragment <= 3/.test(particles)],
  ["reduced-motion fallback retained", /prefers-reduced-motion/.test(fluidCss) && /reducedMotion/.test(fluid)],
  ["mobile landscape guard connected", /mobile-landscape-guard-v246\.css/.test(index)],
  ["portrait mobile is blocked", /orientation: portrait/.test(landscapeCss) && /z-index: 2147483647/.test(landscapeCss)],
  ["narrow desktop is not misclassified as mobile", /hover: none/.test(landscapeCss) && /pointer: coarse/.test(landscapeCss)],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? "[OK]" : "[FAIL]"} ${label}`);
  failed ||= !passed;
}
if (failed) process.exit(1);
console.log("[OK] AAA entry sequence v249 contract complete");
