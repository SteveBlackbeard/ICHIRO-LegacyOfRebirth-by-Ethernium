const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file));
const text = (file) => read(file).toString("utf8");
const expect = (condition, message) => { if (!condition) failures.push(message); };

const index = text("index.html");
const archive3d = text("archive-3d.js");
const webmSource = index.indexOf("kpco-logo-transparent.webm");
const mp4Source = index.indexOf("kpco-logo.mp4");
expect(webmSource >= 0 && mp4Source > webmSource, "KPCO transparent WebM must precede the MP4 fallback");
expect(archive3d.includes('powerPreference: "high-performance"'), "Archive WebGL must request the high-performance GPU");
expect((archive3d.match(/new THREE\.Raycaster\(\)/g) || []).length === 1, "Lumen must reuse one raycaster instead of allocating per frame");
expect(archive3d.includes("mergeBlueprintGeometry(meshesToProcess, glbHologram)"), "Blueprint meshes must be consolidated before rendering");
expect(!archive3d.includes("mesh.parent.add(maskMesh)"), "Per-mesh blueprint depth masks must remain removed");
const kpcoRenderer = text("modules/kpco-logo.js");
expect(kpcoRenderer.includes("archiveCrop || getArchiveCrop"), "Archive KPCO crop must be cached instead of forcing a GPU readback per frame");
expect(kpcoRenderer.includes("placeDirectVideo()"), "Transparent KPCO video must use compositor-native placement");
const appEvents = text("modules/app-events.js");
expect(appEvents.includes("if (Number.isFinite(published)) return published"), "Inactive portal progress must not force computed-style reads");
expect(appEvents.includes('!archiveScreen.classList.contains("archive-video-active")'), "Hidden archive video must not run its color loop");
expect(appEvents.includes("videoColorTargets.forEach"), "Dynamic video colors must stay scoped to their visual surfaces");
expect(!appEvents.includes('document.documentElement.style.setProperty("--video-color-'), "Dynamic video colors must not invalidate the whole document");
expect(appEvents.includes("archiveVideo.requestVideoFrameCallback(updateVideoColorLoop)"), "Video color work must synchronize with decoded frames");
expect(appEvents.includes("new ResizeObserver"), "Video progress geometry must be resize-driven");
const renderGovernor = text("styles/recovery-master-v251.css");
expect(renderGovernor.includes(".preportal-fluid-entry:not(.preportal-fluid-entry--active)"), "Inactive preportal fluid surface must leave the compositor");
const magneticUi = text("modules/magnetic-ui.js");
const parallaxDepth = text("modules/parallax-depth.js");
expect(magneticUi.includes("if (moving)"), "Magnetic UI must sleep after settling");
expect(parallaxDepth.includes("if (settling)"), "Parallax depth must sleep after settling");
const audio = text("modules/audio.js");
expect(audio.includes("requestVideoFrameCallback(finishSilentPrime)"), "Archive video priming must stop after the first decoded frame");
const styles = text("styles.css");
expect(styles.includes('body.authenticated .archive-video-stage[aria-hidden="true"] *'), "Off-phase archive animations must be paused");
expect(styles.includes(".panel-card.is-locked:hover"), "Locked dossier pulse must run only during interaction");
expect(styles.includes("body.authenticated .profile-box h4"), "Paint-bound profile gradients must be interaction-governed");
expect(styles.includes('html:not([data-kpr-phase="archive-video"]) .lava-drop'), "Lava motion must be scoped to its video phase");

const glb = read("assets/models/lumen-original.glb");
const jsonLength = glb.readUInt32LE(12);
const gltf = JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8").trim());
const binHeader = 20 + ((jsonLength + 3) & ~3);
const binOffset = binHeader + 8;
for (const image of gltf.images || []) {
  if (image.mimeType !== "image/png" || image.bufferView == null) continue;
  const view = gltf.bufferViews[image.bufferView];
  const offset = binOffset + (view.byteOffset || 0);
  const width = glb.readUInt32BE(offset + 16);
  const height = glb.readUInt32BE(offset + 20);
  expect(Math.max(width, height) <= 2048, `Lumen texture ${image.name || image.bufferView} exceeds 2048px (${width}x${height})`);
}

const blueprint = read("assets/models/yatagarasu-blueprint-studio.glb");
const blueprintJsonLength = blueprint.readUInt32LE(12);
const blueprintGltf = JSON.parse(blueprint.subarray(20, 20 + blueprintJsonLength).toString("utf8").trim());
const triangleCount = (blueprintGltf.meshes || []).reduce((total, mesh) => total + (mesh.primitives || []).reduce((meshTotal, primitive) => {
  const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
  return meshTotal + Math.floor((blueprintGltf.accessors?.[accessorIndex]?.count || 0) / 3);
}, 0), 0);
expect(triangleCount <= 300_000, `Studio blueprint exceeds 300k triangles (${triangleCount})`);

const logoWebm = read("assets/video/kpco-logo-transparent.webm");
expect(logoWebm.toString("latin1").toLowerCase().includes("alpha_mode"), "KPCO WebM must advertise an alpha channel");
expect(fs.statSync(path.join(root, "assets/video/designation-silent-sentinel-budget.mp4")).size <= 35_000_000,
  "Archive delivery video must remain within the 35 MB production decode budget");

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}
console.log("Media performance contracts passed.");
