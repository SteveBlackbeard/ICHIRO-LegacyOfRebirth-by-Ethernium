const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const app = readFileSync(join(root, "app.js"), "utf8");
const focus = readFileSync(join(root, "modules", "focus-manager.js"), "utf8");
const lore = readFileSync(join(root, "modules", "lore.js"), "utf8");
const archive = readFileSync(join(root, "modules", "archive-ui.js"), "utf8");
const events = readFileSync(join(root, "modules", "app-events.js"), "utf8");
const browserProof = readFileSync(join(root, "tools", "e2e-proof.js"), "utf8");
const failures = [];

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

requireMatch(html, /<html[^>]+\blang="en"/i, "document language is not English");
requireMatch(html, /id="case-viewer"[^>]+role="dialog"[^>]+aria-modal="true"/i, "case viewer is not a modal dialog");
requireMatch(html, /id="details-modal"[^>]+aria-modal="true"[^>]+role="dialog"/i, "details view is not a modal dialog");
requireMatch(html, /aria-describedby="archive-navigation-instruction"/i, "archive navigation has no accessible instruction");
requireMatch(css, /:focus-visible/, "visible keyboard focus treatment is missing");
requireMatch(css, /\.sr-only\s*\{/, "screen-reader-only utility is missing");
requireMatch(app, /createFocusManager\(\)/, "focus manager is not instantiated");
requireMatch(archive, /focusManager\?\.activate\(caseViewer/, "case viewer does not claim focus");
requireMatch(archive, /focusManager\?\.deactivate\(caseViewer\)/, "case viewer does not restore focus");
requireMatch(events, /focusManager\?\.activate\(modal/, "details modal does not claim focus");
requireMatch(events, /focusManager\?\.deactivate\(modal\)/, "details modal does not restore focus");
requireMatch(focus, /event\.key [!=]==? "Tab"/, "focus manager does not trap Tab");
requireMatch(focus, /event\.key === "Escape"/, "focus manager does not own Escape");
requireMatch(focus, /returnTarget\.focus/, "focus manager does not restore its trigger");
requireMatch(lore, /setAttribute\("role", "tablist"\)/, "lore has no tablist role");
requireMatch(lore, /setAttribute\("role", "tabpanel"\)/, "lore has no tabpanel role");
requireMatch(lore, /"ArrowRight"|"ArrowLeft"/, "lore tabs have no arrow-key navigation");
requireMatch(lore, /aria-controls/, "lore tabs do not reference their panel");
requireMatch(browserProof, /\bmjs:\s*"text\/javascript/, "browser proof server does not serve ESM .mjs as JavaScript");

const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
const unnamedImages = images.filter((tag) => !/\balt="[^"]*"/i.test(tag));
if (unnamedImages.length) failures.push(`${unnamedImages.length} image(s) have no alt attribute`);

const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)];
const unnamedButtons = buttons.filter(([, attributes, body]) => {
  if (/\baria-label="[^"]+"/i.test(attributes)) return false;
  const text = body.replace(/<[^>]+>/g, " ").replace(/&[a-z0-9#]+;/gi, " ").trim();
  return !text;
});
if (unnamedButtons.length) failures.push(`${unnamedButtons.length} button(s) have no accessible name`);

const positiveTabindex = [...html.matchAll(/\btabindex="([1-9]\d*)"/gi)];
if (positiveTabindex.length) failures.push(`${positiveTabindex.length} positive tabindex value(s) distort reading order`);

const report = {
  generatedAt: new Date().toISOString(),
  metrics: {
    buttons: buttons.length,
    images: images.length,
    modalDialogs: (html.match(/\brole="dialog"/g) || []).length,
    unnamedButtons: unnamedButtons.length,
    unnamedImages: unnamedImages.length,
  },
  status: failures.length ? "failed" : "passed",
  version: 257,
  violations: failures,
};
const output = join(root, ".artifacts", "accessibility", "accessibility-contract-v257.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[INFO] ${buttons.length} button(s), ${images.length} image(s), ${report.metrics.modalDialogs} dialog(s)`);
console.log(`[INFO] report: ${output}`);
for (const failure of failures) console.log(`[FAIL] ${failure}`);
if (failures.length) process.exit(1);
console.log("[OK] accessibility v257 contract complete");
