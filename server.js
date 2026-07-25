const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 8000);
const ROOT = path.resolve(__dirname);
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

function headers(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const immutable = /\.(?:png|jpe?g|gif|svg|webp|mp4|webm|mp3|glb|woff2)$/i.test(filePath);
  return {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
    "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}

function resolveRequest(urlValue) {
  const parsed = new URL(urlValue, `http://127.0.0.1:${PORT}`);
  const pathname = decodeURIComponent(parsed.pathname === "/" ? "/index.html" : parsed.pathname);
  const candidate = path.resolve(ROOT, `.${pathname}`);
  if (candidate !== ROOT && !candidate.startsWith(`${ROOT}${path.sep}`)) return null;
  return candidate;
}

function sendRange(req, res, filePath, stat, baseHeaders) {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(req.headers.range || "");
  if (!match) return false;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : stat.size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || end >= stat.size) {
    res.writeHead(416, { ...baseHeaders, "Content-Range": `bytes */${stat.size}` });
    res.end();
    return true;
  }
  res.writeHead(206, {
    ...baseHeaders,
    "Accept-Ranges": "bytes",
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Content-Length": end - start + 1,
  });
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(filePath, { start, end }).pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  if (!["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  let filePath;
  try {
    filePath = resolveRequest(req.url || "/");
  } catch {
    filePath = null;
  }
  if (!filePath) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad Request");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const baseHeaders = headers(filePath);
    if (sendRange(req, res, filePath, stat, baseHeaders)) return;
    res.writeHead(200, {
      ...baseHeaders,
      "Accept-Ranges": "bytes",
      "Content-Length": stat.size,
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`ICHIRO KPR portal ready at http://127.0.0.1:${PORT}/`);
});
