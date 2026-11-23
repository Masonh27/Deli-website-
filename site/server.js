// Zero-dependency static server for the Divicious draft. Run: node server.js  (PORT env optional)
const http = require("http");
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "public");
const PORT = process.env.PORT || 4620;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  if (!path.extname(p)) p += ".html"; // /menu -> menu.html (old-site style URLs)
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found"); }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(buf);
  });
}).listen(PORT, () => console.log(`Divicious draft on http://localhost:${PORT}`));
