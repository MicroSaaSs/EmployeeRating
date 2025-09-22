import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { Response } from "express";
import { UsersService } from "./users.service";
import { AuthService } from "../auth/auth.service";
import { RatingsService } from "../ratings/ratings.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly ratings: RatingsService
  ) {}

  @Get("me")
  me(@Req() req: any, @Res() res: Response) {
    const sid = req.cookies?.sid as string | undefined;
    const sess = this.auth.getSessionBySid(sid || null);
    if (!sess) return res.status(401).send();
    const user = this.users.findById(sess.user.id);
    const ratingsGiven = this.ratings.listByRater(sess.user.id);
    return res.json({ user, ratingsGiven });
  }

  @Get("trending")
  trending(@Res() res: Response) {
    const professionals = this.users.listTrendingProfessionals();
    return res.json({ professionals });
  }

  @Get("search")
  search(@Res() res: Response) {
    const professionals = this.users.searchProfessionals();
    return res.json({ professionals });
  }

  @Get("suggestions")
  suggestions(@Query("q") q: string | undefined, @Res() res: Response) {
    const suggestions = this.users.listSuggestions(q);
    return res.json({ suggestions });
  }

  @Get("activities")
  activities(
    @Query("filter") filter: "all" | "received" | "given",
    @Res() res: Response
  ) {
    const f = (filter as any) || "all";
    const activities = this.users.listRecentActivities(f);
    return res.json({ activities });
  }

  @Get("profile/:id")
  profile(@Param("id") id: string, @Res() res: Response) {
    const profile = this.users.getProfileById(id);
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    return res.json({ profile });
  }

  // Professionals CRUD
  @Post("professionals")
  createProfessional(@Body() body: any, @Res() res: Response) {
    const professional = this.users.createProfessional(body);
    return res.status(201).json({ professional });
  }

  @Put("professionals/:id")
  updateProfessional(
    @Param("id") id: string,
    @Body() body: any,
    @Res() res: Response
  ) {
    const updated = this.users.updateProfessional(id, body);
    if (!updated) return res.status(404).send();
    return res.json({ professional: updated });
  }

  @Delete("professionals/:id")
  deleteProfessional(@Param("id") id: string, @Res() res: Response) {
    const removed = this.users.deleteProfessional(id);
    return res.json({ removed });
  }

  // Activities CRUD (minimal)
  @Post("activities")
  createActivity(@Body() body: any, @Res() res: Response) {
    const activity = this.users.createActivity(body);
    return res.status(201).json({ activity });
  }

  @Delete("activities/:id")
  deleteActivity(@Param("id") id: string, @Res() res: Response) {
    const removed = this.users.deleteActivity(id);
    return res.json({ removed });
  }
}
