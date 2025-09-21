import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Response } from "express";
import { UsersService } from "./users.service";
import { AuthService } from "../auth/auth.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService
  ) {}

  @Get("me")
  me(@Req() req: any, @Res() res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const user = this.users.findById(sess.user.id);
    return res.json({ user });
  }
}
