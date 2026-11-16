import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import express from "express";
import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";
import { clientOrigin, linkedInConfig } from "./config";

export function configureApp(app: NestExpressApplication) {
  const origin = clientOrigin();
  const apiOnly = process.env.EPRORATE_HEROKU_ROLE === "api";
  const secret = process.env.CLIENT_PROXY_SECRET;
  if (apiOnly && !/^[a-f0-9]{64}$/.test(secret || "")) {
    throw new Error("Invalid CLIENT_PROXY_SECRET");
  }
  const hash = (value: string) => createHash("sha256").update(value).digest();
  const proxyDigest = apiOnly && secret ? hash(secret) : undefined;
  const dist = resolve(process.env.CLIENT_DIST || "../client/build");
  const index = resolve(dist, "index.html");
  if (!apiOnly && process.env.NODE_ENV === "production" && !existsSync(index)) {
    throw new Error("The production client build is missing");
  }
  const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
  if (!Number.isSafeInteger(proxyHops) || proxyHops < 0) throw new Error("Invalid TRUST_PROXY_HOPS");

  app.set("trust proxy", proxyHops);
  app.enable("case sensitive routing");
  app.disable("x-powered-by");
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.set("Referrer-Policy", "no-referrer");
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("Content-Security-Policy", [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "));
    if (/^\/api(?:\/|$)/i.test(req.path)) {
      res.set("Cache-Control", "no-store");
      const publicHealth = ["GET", "HEAD"].includes(req.method) && req.path === "/api/health";
      if (proxyDigest && !publicHealth && !timingSafeEqual(proxyDigest, hash(req.get("x-eprorate-proxy") || ""))) {
        res.status(403).json({ message: "Use the E-ProRate client to access the API." });
        return;
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.get("origin") !== origin) {
        res.status(403).json({ message: "This request must come from E-ProRate." });
        return;
      }
    }
    next();
  });

  if (!apiOnly && existsSync(index)) {
    const staticFiles = express.static(dist, { index: false });
    app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (/^\/api(?:\/|$)/i.test(req.path)) return next();
      staticFiles(req, res, () => {
        if ((req.method === "GET" || req.method === "HEAD") && req.accepts("html") && !req.path.startsWith("/assets/")) {
          res.set("Cache-Control", "no-cache").sendFile(index);
        } else {
          next();
        }
      });
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  if (process.env.NODE_ENV === "production") linkedInConfig();
  configureApp(app);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
  await app.listen(port, host);
  Logger.log(`API listening on port ${port}`, "Bootstrap");
}

if (require.main === module) {
  bootstrap().catch(() => {
    Logger.error("Server startup failed. Check environment configuration and dependency access.", "Bootstrap");
    process.exitCode = 1;
  });
}
