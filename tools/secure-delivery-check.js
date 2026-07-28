const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const http = require("node:http");
const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const root = resolve(__dirname, "..");
const policy = JSON.parse(readFileSync(join(root, "config", "delivery-policy.v258.json"), "utf8"));
const port = 43000 + (process.pid % 10000);
const base = `http://127.0.0.1:${port}`;

function request(pathname, { method = "GET", headers = {} } = {}) {
  return new Promise((resolveRequest, rejectRequest) => {
    const requestHandle = http.request(`${base}${pathname}`, { method, headers }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolveRequest({
        body: Buffer.concat(chunks),
        headers: response.headers,
        status: response.statusCode,
      }));
    });
    requestHandle.on("error", rejectRequest);
    requestHandle.end();
  });
}

async function waitForServer() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      return await request("/index.html", { method: "HEAD" });
    } catch (error) {
      lastError = error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 50));
    }
  }
  throw lastError || new Error("server did not start");
}

async function main() {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: root,
    env: { ...process.env, KPR_HTTPS: "1", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const output = [];
  child.stdout.on("data", (chunk) => output.push(chunk.toString()));
  child.stderr.on("data", (chunk) => output.push(chunk.toString()));

  try {
    const document = await waitForServer();
    assert.equal(document.status, 200);
    assert.equal(document.headers["content-type"], "text/html; charset=utf-8");
    assert.equal(document.headers["cache-control"], policy.cacheControl.documents);
    for (const [name, value] of Object.entries({
      ...policy.securityHeaders,
      ...policy.httpsHeaders,
    })) {
      assert.equal(document.headers[name.toLowerCase()], value, `header mismatch: ${name}`);
    }
    assert.ok(document.headers.etag, "document has no ETag");

    const notModified = await request("/index.html", {
      method: "HEAD",
      headers: { "If-None-Match": document.headers.etag },
    });
    assert.equal(notModified.status, 304);

    const moduleResponse = await request("/modules/dossier-contracts.mjs", { method: "HEAD" });
    assert.equal(moduleResponse.status, 200);
    assert.equal(moduleResponse.headers["content-type"], "text/javascript; charset=utf-8");
    assert.equal(moduleResponse.headers["cache-control"], policy.cacheControl.code);

    const asset = await request("/assets/video/portal-transition-production.mp4", { method: "HEAD" });
    assert.equal(asset.status, 200);
    assert.equal(asset.headers["cache-control"], policy.cacheControl.assets);
    assert.doesNotMatch(asset.headers["cache-control"], /immutable/i);

    const range = await request("/index.html", { headers: { Range: "bytes=0-15" } });
    assert.equal(range.status, 206);
    assert.equal(range.body.length, 16);
    assert.match(range.headers["content-range"] || "", /^bytes 0-15\//);

    const methodRejected = await request("/index.html", { method: "POST" });
    assert.equal(methodRejected.status, 405);
    assert.equal(methodRejected.headers["x-content-type-options"], "nosniff");

    const traversalRejected = await request("/%2e%2e%2fpackage.json");
    assert.equal(traversalRejected.status, 400);

    const report = {
      version: "v258",
      checks: {
        cacheRevalidation: true,
        contentSecurityPolicy: true,
        esmMime: true,
        httpsPolicy: true,
        rangeRequests: true,
        traversalDefense: true,
      },
      status: "passed",
    };
    const reportPath = join(root, ".artifacts", "delivery", "secure-delivery-v258.json");
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`[INFO] report: ${reportPath}`);
    console.log("[OK] secure delivery v258 contract complete");
  } finally {
    child.kill();
  }
}

main().catch((error) => {
  console.error(`[FAIL] ${error.stack || error.message}`);
  process.exitCode = 1;
});
