import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Post, Query, Req, Res, ServiceUnavailableException } from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { clientOrigin } from "../config";
import { Database } from "../database/database";
import { AccountSuspendedException, AuthService, attemptMinutes, digest, sessionHours } from "./auth.service";

const attemptCookie = "oauth_browser";
const cookie = (path: string): CookieOptions => ({
  httpOnly: true,
  secure: clientOrigin().startsWith("https:"),
  sameSite: "lax",
  path,
});

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly db: Database) {}

  @Post("linkedin/start")
  @HttpCode(200)
  async start(@Body("invite") invite: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.db.limit("oauth:" + digest(req.ip || "unknown"), 30);
    let attempt;
    try {
      attempt = await this.auth.start(invite);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new ServiceUnavailableException("LinkedIn sign-in is unavailable. Try again later.");
    }
    res.cookie(attemptCookie, attempt.browser, {
      ...cookie("/api/auth/linkedin"), maxAge: attemptMinutes * 60_000,
    });
    return { url: attempt.url };
  }

  @Get("linkedin/callback")
  async callback(
    @Query("code") code: unknown,
    @Query("state") state: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const origin = clientOrigin();
    try {
      const session = await this.auth.complete(code, state, req.cookies?.[attemptCookie], req.cookies?.sid);
      res.clearCookie(attemptCookie, cookie("/api/auth/linkedin"));
      res.cookie("sid", session, { ...cookie("/"), maxAge: sessionHours * 3_600_000 });
      return res.redirect(303, origin + "/dashboard-home");
    } catch (error) {
      const reason = error instanceof AccountSuspendedException ? "suspended"
        : error instanceof ForbiddenException ? "invite" : "signin";
      return res.redirect(303, origin + "/login-register?error=" + reason);
    }
  }

  @Get("session")
  async session(@Req() req: Request, @Res() res: Response) {
    const user = await this.auth.sessionUser(req);
    return user ? res.json({ user }) : res.status(204).end();
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.sid);
    res.clearCookie("sid", cookie("/"));
  }
}
