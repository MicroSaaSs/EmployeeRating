import express from "express";
import { existsSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { fileURLToPath } from "node:url";

const upstream = new URL(process.env.API_UPSTREAM_URL);
const clientOrigin = new URL(process.env.CLIENT_APP_URL);
const production = process.env.NODE_ENV === "production";
for (const url of [upstream, clientOrigin]) {
  if (url.href !== url.origin + "/" ||
      !(url.protocol === "https:" || (!production && url.protocol === "http:"))) {
    throw new Error("API_UPSTREAM_URL and CLIENT_APP_URL must be valid origins (HTTPS in production)");
  }
}
if (upstream.origin === clientOrigin.origin) throw new Error("The API must have its own origin");

const secret = process.env.CLIENT_PROXY_SECRET;
if (!/^[a-f0-9]{64}$/.test(secret ?? "")) throw new Error("Invalid CLIENT_PROXY_SECRET");

const dist = fileURLToPath(new URL("../client/build/", import.meta.url));
const index = fileURLToPath(new URL("../client/build/index.html", import.meta.url));
if (!existsSync(index)) throw new Error("The production client build is missing");

const app = express();
app.disable("x-powered-by");
if (production) app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.set({
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "worker-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
  });
  if (production) res.set("Strict-Transport-Security", "max-age=31536000");
  next();
});

function endToEndHeaders(headers) {
  const connectionOptions = (headers.connection ?? "").toLowerCase().split(",").map(value => value.trim());
  const hopByHop = new Set([
    "connection", "keep-alive", "proxy-connection", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade", ...connectionOptions,
  ]);
  return Object.fromEntries(Object.entries(headers).filter(([name]) => !hopByHop.has(name)));
}

app.use("/api", (req, res) => {
  const headers = endToEndHeaders(req.headers);
  for (const name of ["host", "forwarded", "x-forwarded-host", "x-forwarded-port", "x-forwarded-proto"]) {
    delete headers[name];
  }
  headers["x-forwarded-for"] = req.ip ?? req.socket.remoteAddress;
  headers["x-eprorate-proxy"] = secret;

  const request = upstream.protocol === "https:" ? httpsRequest : httpRequest;
  const proxy = request(upstream, { path: req.originalUrl, method: req.method, headers }, response => {
    response.on("error", () => res.destroy());
    res.writeHead(response.statusCode, endToEndHeaders(response.headers));
    response.pipe(res);
  });
  proxy.on("error", () => {
    if (res.headersSent) res.destroy();
    else if (!res.destroyed) res.set("Cache-Control", "no-store").status(502).json({ message: "API unavailable" });
  });
  proxy.setTimeout(25000, () => proxy.destroy(new Error("API timed out")));
  res.on("close", () => {
    if (!res.writableFinished) proxy.destroy();
  });
  req.pipe(proxy);
});

app.use(express.static(dist, { index: false }));
app.use((req, res, next) => {
  if ((req.method === "GET" || req.method === "HEAD") && req.accepts("html") && !req.path.startsWith("/assets/")) {
    return res.set("Cache-Control", "no-cache").sendFile(index);
  }
  next();
});

const server = app.listen(Number(process.env.PORT || 4028), "0.0.0.0");
server.keepAliveTimeout = 91000;
process.on("SIGTERM", () => server.close());
