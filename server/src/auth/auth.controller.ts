import { Controller, Get, Res, Logger, Query, Req, Post } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly auth: AuthService) {}

  @Get("linkedin/start")
  start(@Res() res: Response) {
    const url = this.auth.buildAuthorizationUrl();
    this.logger.log(`LinkedIn auth start: redirecting to ${url}`);
    return res.redirect(url);
  }

  @Get("linkedin/callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Query("error") error: string | undefined,
    @Query("error_description") errorDescription: string | undefined,
    @Res() res: Response
  ) {
    this.logger.log("LinkedIn callback received");
    if (error) {
      this.logger.error(`LinkedIn error: ${error} - ${errorDescription}`);
      return res.status(400).send({ error, errorDescription });
    }
    try {
      const { sid } = await this.auth.handleCallback({ code, state });
      this.logger.debug(`Session created with sid=${sid}`);
      res.cookie("sid", sid, { httpOnly: false, sameSite: "lax" });
      const redirect = process.env.CLIENT_APP_URL || "http://localhost:5173";
      this.logger.log(`Redirecting to client: ${redirect}`);
      return res.redirect(redirect);
    } catch (e: any) {
      this.logger.error(`Callback handling failed: ${e?.message || e}`);
      return res.status(500).send({ error: "callback_failed" });
    }
  }

  @Get("session")
  session(@Req() req: any, @Res() res: Response) {
    try {
      const sid = req.cookies?.sid as string | undefined;
      const sess = this.auth.getSessionBySid(sid || null);
      if (!sess) return res.status(204).send();
      return res.json(sess);
    } catch {
      return res.status(204).send();
    }
  }

  @Get("logout")
  logout(@Req() req: any, @Res() res: Response) {
    return this.performLogout(req, res);
  }

  @Post("logout")
  logoutPost(@Req() req: any, @Res() res: Response) {
    return this.performLogout(req, res);
  }

  private performLogout(req: any, res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    this.auth.destroySession(sid || null);
    res.clearCookie("sid");
    return res.status(204).send();
  }
}
