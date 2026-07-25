const { readFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const root = dirname(dirname(__filename));
const read = (file) => readFileSync(join(root, file), "utf8");
const html = read("index.html");
const css = read("styles/transmission-premium-v246.css");
const landscapeCss = read("styles/mobile-landscape-guard-v246.css");

const checks = [
  ["premium stylesheet connected after baseline", html.indexOf("styles.css?v=") < html.indexOf("transmission-premium-v246.css")],
  ["premium layer is isolated to transmission overlay", !css.includes(":root") && css.includes(".intercepted-transmission-overlay")],
  ["desktop composition contract", css.includes("grid-template-columns: minmax(250px, 1fr)")],
  ["central hierarchy contract", css.includes(".transmission-glitch-box") && css.includes("min-height: 292px")],
  ["readability contract", css.includes("word-break: normal") && css.includes("line-height: 1.72")],
  ["keyboard focus contract", css.includes(".activate-firewall-btn:focus-visible")],
  ["tablet and mobile contracts", css.includes("@media (max-width: 980px)") && css.includes("@media (max-width: 720px)")],
  ["small mobile contract", css.includes("@media (max-width: 430px)")],
  ["reduced motion contract", css.includes("@media (prefers-reduced-motion: reduce)")],
  ["portrait orientation guard connected", html.includes("mobile-landscape-guard-v246.css") && html.includes("mobile-landscape-guard")],
  ["landscape is mandatory on mobile", landscapeCss.includes("(orientation: portrait)") && landscapeCss.includes("ROTATE DEVICE") === false],
  ["authored landscape layout retained", css.includes("(orientation: landscape)") && css.includes("grid-template-columns: minmax(155px, .8fr)")],
  ["orientation guard honors reduced motion", landscapeCss.includes("@media (prefers-reduced-motion: reduce)")],
  ["runtime behavior remains external", !css.includes("pointer-events: none !important") && !css.includes("display: none !important")],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`[${passed ? "OK" : "FAIL"}] ${label}`);
  failed ||= !passed;
}

if (failed) process.exit(1);
console.log("[OK] premium transmission v246 contract complete");
