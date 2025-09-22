import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { RatingsService } from "./ratings.service";
import { AuthService } from "../auth/auth.service";

@Controller("ratings")
export class RatingsController {
  constructor(
    private readonly ratings: RatingsService,
    private readonly auth: AuthService
  ) {}

  @Get("given")
  given(@Req() req: any, @Res() res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const ratings = this.ratings.listByRater(sess.user.id);
    return res.json({ ratings });
  }

  @Get("received")
  received(@Req() req: any, @Res() res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const ratings = this.ratings.listByReceiver(sess.user.id);
    return res.json({ ratings });
  }

  @Get("for/:userId")
  forUser(@Param("userId") userId: string, @Res() res: Response) {
    const ratings = this.ratings.listByTarget(userId);
    return res.json({ ratings });
  }

  @Post()
  create(@Body() body: any, @Req() req: any, @Res() res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const id = body.id || `${Date.now()}`;
    const record = this.ratings.upsert({
      id,
      raterUserId: body.raterUserId || sess.user.id,
      targetUserId: body.targetUserId,
      score: Number(body.score) || 0,
      category: body.category,
      comment: body.comment,
      createdAt: Date.now(),
    });
    return res.status(201).json({ rating: record });
  }

  @Put(":id")
  update(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
    @Res() res: Response
  ) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const existing = this.ratings.getById(id);
    if (!existing) return res.status(404).send();
    if (existing.raterUserId !== sess.user.id) return res.status(403).send();
    const updated = this.ratings.upsert({
      ...existing,
      score: body.score !== undefined ? Number(body.score) : existing.score,
      category: body.category ?? existing.category,
      comment: body.comment ?? existing.comment,
    });
    return res.json({ rating: updated });
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Req() req: any, @Res() res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const existing = this.ratings.getById(id);
    if (!existing) return res.status(404).send();
    if (existing.raterUserId !== sess.user.id) return res.status(403).send();
    const removed = this.ratings.delete(id);
    return res.json({ removed });
  }
}
