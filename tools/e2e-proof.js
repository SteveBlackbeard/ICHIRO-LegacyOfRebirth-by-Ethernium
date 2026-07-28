const assert = require("node:assert/strict");
const { spawn, execFileSync } = require("node:child_process");
const { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } = require("node:fs");
const { createServer } = require("node:http");
const { join, resolve } = require("node:path");
const puppeteer = require("puppeteer-core");
const deliveryPolicy = require("../config/delivery-policy.v258.json");

const root = resolve(__dirname, "..");
const artifacts = resolve(root, process.env.KPR_E2E_ARTIFACTS || ".artifacts/e2e");
const serverRoot = resolve(process.env.KPR_E2E_SERVER_ROOT || root);
const assetFallbackRoot = process.env.KPR_E2E_ASSET_ROOT
  ? resolve(process.env.KPR_E2E_ASSET_ROOT)
  : null;
const port = Number(process.env.KPR_E2E_PORT || 4173);
const externalBaseUrl = process.env.KPR_E2E_BASE_URL?.replace(/\/+$/, "");
const baseUrl = externalBaseUrl || `http://127.0.0.1:${port}`;
const strictWarnings = process.env.KPR_E2E_STRICT_WARNINGS === "1";
const headless = process.env.KPR_E2E_HEADLESS !== "0";
const report = {
  version: "v260",
  baseUrl,
  serverRoot,
  assetFallbackRoot,
  startedAt: new Date().toISOString(),
  browser: {},
  stages: [],
  console: [],
  pageErrors: [],
  failedRequests: [],
  badResponses: [],
  assetFallbacks: [],
  checks: {},
};

mkdirSync(artifacts, { recursive: true });

function browserCandidates() {
  const candidates = [
    process.env.KPR_E2E_BROWSER_PATH,
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);

  if (process.platform !== "win32") {
    for (const command of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
      try {
        const resolved = execFileSync("which", [command], { encoding: "utf8" }).trim();
        if (resolved) candidates.unshift(resolved);
      } catch {}
    }
  }
  return [...new Set(candidates)];
}

function findBrowser() {
  const executable = browserCandidates().find((candidate) => existsSync(candidate));
  if (!executable) {
    throw new Error("Chrome/Edge executable not found. Set KPR_E2E_BROWSER_PATH.");
  }
  return executable;
}

async function waitForHttp(url, timeout = 20_000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 160));
  }
  throw new Error(`Server did not become ready: ${lastError?.message || "timeout"}`);
}

function mimeType(file) {
  const extension = file.split(".").at(-1)?.toLowerCase();
  return {
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    mjs: "text/javascript; charset=utf-8",
    json: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    avif: "image/avif",
    webp: "image/webp",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    glb: "model/gltf-binary",
    woff2: "font/woff2",
  }[extension] || "application/octet-stream";
}

function safeFile(base, pathname) {
  const candidate = resolve(base, `.${pathname}`);
  return candidate === base || candidate.startsWith(`${base}\\`) || candidate.startsWith(`${base}/`)
    ? candidate
    : null;
}

function startOverlayServer() {
  const server = createServer((request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url || "/", `http://127.0.0.1:${port}`).pathname);
    } catch {
      response.writeHead(400).end("Bad Request");
      return;
    }
    if (pathname === "/") pathname = "/index.html";
    const primary = safeFile(root, pathname);
    const fallback = assetFallbackRoot ? safeFile(assetFallbackRoot, pathname) : null;
    const localAliases = {
      "/assets/video/portal-transition-production.mp4": "/assets/video/portal-transition.mp4",
    };
    const aliasPath = assetFallbackRoot && localAliases[pathname]
      ? safeFile(assetFallbackRoot, localAliases[pathname])
      : null;
    const file = [primary, fallback, aliasPath].find((candidate) => {
      try {
        return candidate && existsSync(candidate) && statSync(candidate).isFile();
      } catch {
        return false;
      }
    });
    if (!file) {
      response.writeHead(404, {
        ...deliveryPolicy.securityHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      }).end("404 Not Found");
      return;
    }
    if (file === aliasPath && !report.assetFallbacks.some((entry) => entry.request === pathname)) {
      report.assetFallbacks.push({ request: pathname, served: localAliases[pathname] });
    }

    const stat = statSync(file);
    const headers = {
      ...deliveryPolicy.securityHeaders,
      "Content-Type": mimeType(file),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    };
    const range = /^bytes=(\d*)-(\d*)$/i.exec(request.headers.range || "");
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : stat.size - 1;
      if (start < 0 || end < start || end >= stat.size) {
        response.writeHead(416, { ...headers, "Content-Range": `bytes */${stat.size}` }).end();
        return;
      }
      response.writeHead(206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Content-Length": end - start + 1,
      });
      if (request.method === "HEAD") response.end();
      else createReadStream(file, { start, end }).pipe(response);
      return;
    }
    response.writeHead(200, { ...headers, "Content-Length": stat.size });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  });

  return new Promise((resolveStart, rejectStart) => {
    server.once("error", rejectStart);
    server.listen(port, "127.0.0.1", () => {
      resolveStart({
        kill() {
          server.close();
        },
      });
    });
  });
}

async function startServer() {
  if (externalBaseUrl) return null;
  if (assetFallbackRoot) return startOverlayServer();
  return spawn(process.execPath, ["server.js"], {
    cwd: serverRoot,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function isVisible(page, selector) {
  return page.$eval(selector, (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none"
      && style.visibility !== "hidden"
      && Number(style.opacity) > 0.01
      && rect.width > 1
      && rect.height > 1
      && rect.right > 0
      && rect.bottom > 0
      && rect.left < innerWidth
      && rect.top < innerHeight;
  });
}

async function waitForVisible(page, selector, timeout = 12_000) {
  await page.waitForSelector(selector, { timeout });
  await page.waitForFunction(
    (target) => {
      const element = document.querySelector(target);
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none"
        && style.visibility !== "hidden"
        && Number(style.opacity) > 0.01
        && rect.width > 1
        && rect.height > 1
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < innerWidth
        && rect.top < innerHeight;
    },
    { timeout },
    selector,
  );
}

async function capture(page, name) {
  const file = join(artifacts, `${String(report.stages.length + 1).padStart(2, "0")}-${name}.png`);
  const bytes = await page.screenshot({ path: file, type: "png" });
  assert.ok(bytes.length > 10_000, `${name} screenshot appears blank`);
  report.stages.push({ name, file: file.replaceAll("\\", "/"), bytes: bytes.length });
}

function observePage(page) {
  page.on("console", (message) => {
    const entry = { type: message.type(), text: message.text() };
    report.console.push(entry);
  });
  page.on("pageerror", (error) => {
    report.pageErrors.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText || "unknown";
    if (!url.startsWith("data:") && failure !== "net::ERR_ABORTED") {
      report.failedRequests.push({ url, failure });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      report.badResponses.push({ url: response.url(), status: response.status() });
    }
  });
}

async function clickActivationSymbol(page) {
  await waitForVisible(page, "#activation-button");
  await page.click("#activation-button .activation-symbol");
}

async function runDesktopGoldenPath(browser) {
  const page = await browser.newPage();
  observePage(page);
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  await page.goto(`${baseUrl}/index.html?kpr=e2e-proof-260&sword=clean-decal&input=pointer`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForVisible(page, "#activation-screen");
  await capture(page, "activation");

  await clickActivationSymbol(page);
  await page.waitForFunction(
    () => document.querySelector(".activation-text")?.textContent?.includes("INITIALIZE HACK"),
    { timeout: 4_000 },
  );
  await clickActivationSymbol(page);
  await page.waitForFunction(() => !document.body.classList.contains("prelaunch"), { timeout: 5_000 });
  await delay(360);
  await capture(page, "hack-simulation");

  await page.waitForFunction(() => !document.body.classList.contains("intro-active"), { timeout: 8_000 });
  await waitForVisible(page, "#login-screen");
  await capture(page, "access-terminal");

  await page.click("#login-form button[type='submit']");
  await page.waitForFunction(
    () => document.body.classList.contains("authenticated")
      && !document.querySelector("#archive-screen")?.classList.contains("hidden"),
    { timeout: 8_000 },
  );
  await waitForVisible(page, ".kpr-profile");
  await delay(600);
  await capture(page, "character-profile");
  await page.waitForFunction(
    () => window.__kprRuntimeLifecycle?.snapshot?.().phase === "character-profile",
    { timeout: 4_000 },
  );
  report.checks.lifecycleProfile = await page.evaluate(() => window.__kprRuntimeLifecycle.snapshot());
  assert.deepEqual(report.checks.lifecycleProfile.errors, [], "runtime controller failed before profile");
  assert.equal(report.checks.lifecycleProfile.suspended, false, "runtime is suspended during profile");
  assert.equal(
    report.checks.lifecycleProfile.controllers.find(({ name }) => name === "kpco-logo")?.active,
    true,
    "KPCO owner is inactive during profile",
  );
  assert.equal(
    report.checks.lifecycleProfile.controllers.find(({ name }) => name === "lumen-stats")?.active,
    true,
    "LUMEN stats owner is inactive during profile",
  );
  report.checks.localDiagnostics = await page.evaluate(() => window.__kprDiagnostics?.snapshot?.());
  assert.equal(report.checks.localDiagnostics?.networkTransmission, false, "diagnostics permit network transmission");
  assert.equal(report.checks.localDiagnostics?.runtime?.phase, "character-profile");
  assert.equal(report.checks.localDiagnostics?.health?.runtimeErrors, 0, "diagnostics recorded a runtime error");
  assert.equal(report.checks.localDiagnostics?.health?.contextLosses, 0, "diagnostics recorded WebGL context loss");
  report.checks.lifecycleSuspendResume = await page.evaluate(() => {
    const lifecycle = window.__kprRuntimeLifecycle;
    lifecycle.suspend("e2e-visibility-contract");
    const suspended = lifecycle.snapshot();
    lifecycle.resume();
    return { resumed: lifecycle.snapshot(), suspended };
  });
  assert.equal(report.checks.lifecycleSuspendResume.suspended.suspended, true);
  assert.equal(report.checks.lifecycleSuspendResume.suspended.suspendReason, "e2e-visibility-contract");
  assert.equal(
    report.checks.lifecycleSuspendResume.suspended.controllers.some(({ active }) => active),
    false,
    "a lifecycle controller remained active while suspended",
  );
  assert.equal(report.checks.lifecycleSuspendResume.resumed.suspended, false);
  assert.equal(
    report.checks.lifecycleSuspendResume.resumed.controllers.find(({ name }) => name === "kpco-logo")?.active,
    true,
    "KPCO owner did not resume",
  );

  const mediaRect = await page.$eval(".dossier-panel-browser", (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width * 0.55, y: rect.top + Math.min(rect.height * 0.4, 320) };
  });
  await page.mouse.move(mediaRect.x, mediaRect.y);
  await delay(180);
  report.checks.cursor = await page.evaluate(({ x, y }) => {
    const pamp = document.querySelector("#pamp-cursor");
    const target = document.elementFromPoint(x, y);
    const style = pamp ? getComputedStyle(pamp) : null;
    return {
      customVisible: Boolean(
        pamp
        && pamp.classList.contains("is-visible")
        && style.display !== "none"
        && Number(style.opacity) > 0.2
      ),
      nativeCursor: target ? getComputedStyle(target).cursor : "missing",
      target: target?.className || target?.tagName || "missing",
    };
  }, mediaRect);
  assert.equal(report.checks.cursor.customVisible, true, "PAMP cursor is not visible over Media Archive");
  assert.equal(report.checks.cursor.nativeCursor, "none", "native cursor owns Media Archive");

  await page.click(".panel-card.is-unlocked");
  await waitForVisible(page, "#case-viewer");
  report.checks.caseDialogFocus = await page.evaluate(() => ({
    activeIsClose: document.activeElement?.matches?.("[data-close-case]") || false,
    insideDialog: document.querySelector("#case-viewer")?.contains(document.activeElement) || false,
  }));
  assert.equal(report.checks.caseDialogFocus.activeIsClose, true, "case dialog did not focus its close control");
  await page.keyboard.down("Shift");
  await page.keyboard.press("Tab");
  await page.keyboard.up("Shift");
  assert.equal(
    await page.evaluate(() => document.querySelector("#case-viewer")?.contains(document.activeElement)),
    true,
    "Shift+Tab escaped the case dialog",
  );
  await capture(page, "dossier-case");
  await page.waitForSelector(".evidence-protocol[data-protocol='CRC-17']", {
    visible: true,
    timeout: 20_000,
  });
  for (const bit of [2, 7, 13]) {
    await page.click(`[data-protocol='CRC-17'] [data-bit='${bit}']`);
  }
  await page.click("[data-protocol='CRC-17'] [data-verify]");
  await page.waitForFunction(
    () => document.querySelector("[data-protocol='CRC-17']")?.classList.contains("is-solved"),
    { timeout: 4_000 },
  );
  report.checks.dossierProtocol = await page.evaluate(() => ({
    status: document.querySelector("[data-protocol='CRC-17'] .evidence-protocol__footer span")?.textContent,
    unlockedNext: document.querySelector(".panel-card[data-file-id='01']")?.classList.contains("is-unlocked"),
  }));
  assert.equal(report.checks.dossierProtocol.unlockedNext, true, "solving dossier 00 did not unlock dossier 01");
  assert.match(report.checks.dossierProtocol.status || "", /PACKET VERIFIED/);
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.querySelector("#case-viewer")?.classList.contains("hidden"),
    { timeout: 4_000 },
  );
  report.checks.caseDialogReturnFocus = await page.evaluate(
    () => document.activeElement?.dataset?.fileId || "",
  );
  assert.equal(report.checks.caseDialogReturnFocus, "00", "case dialog did not restore dossier focus");

  await page.mouse.move(720, 450);
  for (let index = 0; index < 9; index += 1) {
    await page.mouse.wheel({ deltaY: 460 });
    await delay(40);
  }
  await page.waitForFunction(
    () => document.querySelector("#archive-screen")?.classList.contains("archive-video-active"),
    { timeout: 8_000 },
  );
  await waitForVisible(page, "#archive-video-stage");
  await capture(page, "video-lore");
  await page.waitForSelector("#archive-lore-tab-0", { visible: true, timeout: 8_000 });
  await page.focus("#archive-lore-tab-0");
  await page.keyboard.press("ArrowRight");
  report.checks.loreTabsKeyboard = await page.evaluate(() => ({
    activeId: document.activeElement?.id || "",
    selected: [...document.querySelectorAll("[role='tab']")].findIndex(
      (tab) => tab.getAttribute("aria-selected") === "true",
    ),
    panelLabelledBy: document.querySelector("[role='tabpanel']")?.getAttribute("aria-labelledby") || "",
  }));
  assert.equal(report.checks.loreTabsKeyboard.activeId, "archive-lore-tab-1");
  assert.equal(report.checks.loreTabsKeyboard.selected, 1);
  assert.equal(report.checks.loreTabsKeyboard.panelLabelledBy, "archive-lore-tab-1");
  await page.waitForFunction(
    () => window.__kprRuntimeLifecycle?.snapshot?.().phase === "archive-video",
    { timeout: 4_000 },
  );
  report.checks.lifecycleVideo = await page.evaluate(() => window.__kprRuntimeLifecycle.snapshot());
  assert.deepEqual(report.checks.lifecycleVideo.errors, [], "runtime controller failed before video/lore");
  assert.equal(
    report.checks.lifecycleVideo.controllers.find(({ name }) => name === "kpco-logo")?.active,
    true,
    "KPCO owner is inactive during video/lore",
  );
  assert.equal(
    report.checks.lifecycleVideo.controllers.find(({ name }) => name === "lumen-stats")?.active,
    false,
    "LUMEN stats remained active outside character profile",
  );

  for (let index = 0; index < 7; index += 1) {
    await page.mouse.wheel({ deltaY: 460 });
    await delay(45);
  }
  await page.waitForFunction(
    () => document.querySelector("#archive-screen")?.classList.contains("archive-map-active"),
    { timeout: 8_000 },
  );
  await waitForVisible(page, "#eden-map-stage");
  await capture(page, "new-eden-map");

  report.checks.mapNodeHit = await page.$eval(".map-node[data-name='SOLIS']", (element) => {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const describe = (target) => ({
      tag: target.tagName,
      id: target.id,
      className: typeof target.className === "string" ? target.className : target.className?.baseVal || "",
      node: target.closest?.(".map-node")?.dataset.name || "",
      pointerEvents: getComputedStyle(target).pointerEvents,
      zIndex: getComputedStyle(target).zIndex,
    });
    const style = getComputedStyle(element);
    const overlay = element.closest(".eden-map-overlay");
    const rotator = element.closest(".eden-map-rotator");
    return {
      target: document.elementFromPoint(x, y)?.closest?.(".map-node")?.dataset.name
        || document.elementFromPoint(x, y)?.id
        || document.elementFromPoint(x, y)?.className
        || "missing",
      point: { x, y },
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      nodeStyle: { pointerEvents: style.pointerEvents, zIndex: style.zIndex, opacity: style.opacity },
      overlayStyle: overlay
        ? { pointerEvents: getComputedStyle(overlay).pointerEvents, zIndex: getComputedStyle(overlay).zIndex }
        : null,
      rotatorStyle: rotator
        ? { pointerEvents: getComputedStyle(rotator).pointerEvents, zIndex: getComputedStyle(rotator).zIndex }
        : null,
      stack: document.elementsFromPoint(x, y).slice(0, 10).map(describe),
    };
  });
  assert.equal(report.checks.mapNodeHit.target, "SOLIS", "SOLIS is covered by another visual layer");
  await page.click(".map-node[data-name='SOLIS']");
  await waitForVisible(page, "#eden-map-popover");
  report.checks.mapNode = await page.$eval("#eden-map-stage", (element) => element.dataset.selectedNode);
  assert.equal(report.checks.mapNode, "SOLIS");

  await page.click("#portal-enter");
  await page.waitForFunction(
    () => document.documentElement.classList.contains("kpr-warp-dive")
      || document.documentElement.classList.contains("kpr-portal-entering"),
    { timeout: 4_000 },
  );
  await delay(240);
  await capture(page, "portal-crossing");

  report.checks.desktopViewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    bodyWidth: document.body.getBoundingClientRect().width,
  }));
  await page.close();
}

async function runPresentationContracts(browser) {
  const reduced = await browser.newPage();
  observePage(reduced);
  await reduced.setViewport({ width: 1366, height: 768, deviceScaleFactor: 1 });
  await reduced.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await reduced.goto(`${baseUrl}/index.html?kpr=e2e-reduced-252`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  report.checks.reducedMotion = {
    activationVisible: await isVisible(reduced, "#activation-screen"),
    mediaQuery: await reduced.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
  };
  assert.equal(report.checks.reducedMotion.activationVisible, true);
  assert.equal(report.checks.reducedMotion.mediaQuery, true);
  await reduced.close();

  const landscape = await browser.newPage();
  observePage(landscape);
  await landscape.setViewport({
    width: 844,
    height: 390,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await landscape.goto(`${baseUrl}/index.html?kpr=e2e-mobile-landscape-252`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  report.checks.mobileLandscape = {
    activationVisible: await isVisible(landscape, "#activation-screen"),
    guardVisible: await isVisible(landscape, ".mobile-landscape-guard"),
    pampDisplay: await landscape.$eval("#pamp-cursor", (element) => getComputedStyle(element).display),
  };
  assert.equal(report.checks.mobileLandscape.activationVisible, true);
  assert.equal(report.checks.mobileLandscape.guardVisible, false);
  assert.equal(report.checks.mobileLandscape.pampDisplay, "none");
  await landscape.close();

  const portrait = await browser.newPage();
  observePage(portrait);
  await portrait.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await portrait.goto(`${baseUrl}/index.html?kpr=e2e-mobile-portrait-252`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  report.checks.mobilePortrait = {
    guardVisible: await isVisible(portrait, ".mobile-landscape-guard"),
  };
  assert.equal(report.checks.mobilePortrait.guardVisible, true);
  await portrait.close();
}

async function main() {
  const server = await startServer();
  let browser;
  let serverOutput = "";
  if (server) {
    server.stdout?.on("data", (chunk) => { serverOutput += chunk.toString(); });
    server.stderr?.on("data", (chunk) => { serverOutput += chunk.toString(); });
  }

  try {
    await waitForHttp(`${baseUrl}/index.html`);
    const executablePath = findBrowser();
    browser = await puppeteer.launch({
      executablePath,
      headless,
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        "--use-angle=swiftshader-webgl",
        "--mute-audio",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });
    report.browser = {
      executablePath,
      version: await browser.version(),
      headless,
    };

    await runDesktopGoldenPath(browser);
    await runPresentationContracts(browser);

    const consoleErrors = report.console.filter((entry) => entry.type === "error");
    const consoleWarnings = report.console.filter((entry) => entry.type === "warning");
    assert.deepEqual(report.pageErrors, [], "uncaught browser exception");
    assert.deepEqual(consoleErrors, [], "browser console error");
    assert.deepEqual(report.failedRequests, [], "failed browser request");
    assert.deepEqual(report.badResponses, [], "HTTP error response");
    if (strictWarnings) assert.deepEqual(consoleWarnings, [], "browser console warning");

    report.completedAt = new Date().toISOString();
    report.ok = true;
    console.log(`[OK] ${report.stages.length} named browser stage(s) captured`);
    console.log(`[OK] ${Object.keys(report.checks).length} runtime/device contract(s) verified`);
    console.log(`[INFO] ${consoleWarnings.length} browser warning(s) recorded`);
    console.log("[OK] browser proof v260 complete");
  } catch (error) {
    report.ok = false;
    report.failure = error.stack || error.message;
    if (browser) {
      const pages = await browser.pages().catch(() => []);
      const page = pages.at(-1);
      if (page && !page.isClosed()) {
        await page.screenshot({ path: join(artifacts, "failure.png"), type: "png" }).catch(() => {});
      }
    }
    throw error;
  } finally {
    report.serverOutput = serverOutput.trim();
    writeFileSync(join(artifacts, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await browser?.close().catch(() => {});
    if (server && !server.killed) server.kill();
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error.message}`);
  process.exitCode = 1;
});
