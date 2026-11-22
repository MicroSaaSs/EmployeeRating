import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Put, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "../auth/auth.service";
import { boolean, colleagueDraftInput, linkedInSourceInput, object, pageNumber, ratingInput, searchTerm, text, workImportInput, workInput } from "./inputs";
import { PilotOperationsService } from "./operations.service";
import { PilotService } from "./pilot.service";
import { colleagueSearch, linkedInProfileUrl } from "./linkedin-profile";
import { ColleagueDraftsService } from "./colleague-drafts.service";
import { ColleagueProfilesService } from "./colleague-profiles.service";

const uuid = new ParseUUIDPipe({ version: "4" });
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller()
export class PilotController {
  constructor(
    private readonly auth: AuthService,
    private readonly pilot: PilotService,
    private readonly operations: PilotOperationsService,
    private readonly drafts: ColleagueDraftsService,
    private readonly colleagueProfiles: ColleagueProfilesService,
  ) {}

  @Get("dashboard")
  async dashboard(@Req() req: Request) {
    return this.pilot.dashboard((await this.auth.requireUser(req)).id);
  }

  @Get("colleague-drafts")
  async colleagueDrafts(@Req() req: Request) {
    return this.drafts.list((await this.auth.requireUser(req)).id);
  }

  @Post("colleague-drafts")
  async saveColleagueDraft(@Req() req: Request, @Body() body: unknown) {
    return this.drafts.save((await this.auth.requireUser(req)).id, colleagueDraftInput(body));
  }

  @Post("colleague-drafts/overlap")
  @HttpCode(200)
  async colleagueOverlap(@Req() req: Request, @Body() body: unknown) {
    const user = await this.auth.requireUser(req);
    return this.drafts.overlap(user.id, colleagueDraftInput(body).history);
  }

  @Delete("colleague-drafts/:id")
  @HttpCode(204)
  async deleteColleagueDraft(@Req() req: Request, @Param("id", uuid) id: string) {
    await this.drafts.remove((await this.auth.requireUser(req)).id, id);
  }

  @Post("colleague-drafts/:id/invitation")
  @HttpCode(204)
  async requestColleagueInvite(@Req() req: Request, @Param("id", uuid) id: string) {
    await this.drafts.requestInvite((await this.auth.requireUser(req)).id, id);
  }

  @Post("colleague-drafts/:id/invitation-link")
  async createDraftInvitationLink(@Req() req: Request, @Param("id", uuid) id: string, @Body("replaceId") replaceId: unknown) {
    const owner = await this.auth.requireUser(req);
    if (replaceId !== undefined && (typeof replaceId !== "string" || !uuidV4.test(replaceId))) {
      throw new BadRequestException("Invalid invitation reference.");
    }
    return this.drafts.createInvitationLink(owner.id, id, replaceId);
  }

  @Post("colleague-drafts/:id/rating-target")
  async preparePrivateRating(@Req() req: Request, @Param("id", uuid) id: string) {
    const member = await this.auth.requireUser(req);
    return this.colleagueProfiles.preparePrivateRating(member.id, id);
  }

  @Get("pilot/colleague-invitations")
  async colleagueInvitations(@Req() req: Request, @Query("page") page: unknown) {
    await this.auth.requireOperator(req);
    return this.drafts.requests(pageNumber(page));
  }

  @Post("pilot/colleague-invitations/:id")
  async issueColleagueInvite(@Req() req: Request, @Param("id", uuid) id: string) {
    const operator = await this.auth.requireOperator(req);
    return this.operations.issueInvite("participant", operator.id, id);
  }

  @Post("colleague-profiles")
  async createColleagueProfile(@Req() req: Request, @Body() body: unknown) {
    const { id } = await this.auth.requireUser(req);
    return this.colleagueProfiles.create(id, colleagueDraftInput(body, true));
  }

  @Get("colleague-profiles/:id")
  async colleagueProfile(@Req() req: Request, @Param("id", uuid) id: string) {
    return this.colleagueProfiles.get((await this.auth.requireUser(req)).id, id);
  }

  @Put("colleague-profiles/:id")
  @HttpCode(204)
  async editColleagueProfile(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    const member = await this.auth.requireUser(req);
    const { revision } = object(body);
    if (typeof revision !== "number" || !Number.isSafeInteger(revision) || revision < 1 || revision > 2_147_483_647) {
      throw new BadRequestException("Reload this draft before editing.");
    }
    await this.colleagueProfiles.edit(member.id, id, revision, colleagueDraftInput(body, true));
  }

  @Post("colleague-profiles/:id/invitations")
  async inviteToColleagueProfile(@Req() req: Request, @Param("id", uuid) id: string) {
    return this.colleagueProfiles.invite((await this.auth.requireUser(req)).id, id);
  }

  @Post("colleague-profiles/:id/claim")
  async startColleagueClaim(@Req() req: Request, @Param("id", uuid) id: string) {
    return this.colleagueProfiles.startClaim((await this.auth.requireUser(req)).id, id);
  }

  @Put("colleague-profiles/:id/claim")
  @HttpCode(204)
  async submitColleagueClaim(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    await this.colleagueProfiles.submitClaim((await this.auth.requireUser(req)).id, id, object(body).revision);
  }

  @Get("pilot/colleague-claims")
  async colleagueClaims(@Req() req: Request, @Query("page") page: unknown) {
    await this.auth.requireOperator(req);
    return this.colleagueProfiles.claims(pageNumber(page));
  }

  @Put("pilot/colleague-claims/:id")
  @HttpCode(204)
  async reviewColleagueClaim(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    const operator = await this.auth.requireOperator(req);
    const { code } = object(body);
    await this.colleagueProfiles.review(operator.id, id, code === null ? null : text(code, "LinkedIn verification code", 20, 20));
  }

  @Get("work-history")
  async work(@Req() req: Request) {
    return this.pilot.work((await this.auth.requireUser(req)).id);
  }

  @Post("work-history")
  @HttpCode(204)
  async addWork(@Req() req: Request, @Body() body: unknown) {
    const user = await this.auth.requireUser(req);
    await this.pilot.saveWork(user.id, null, workInput(body), linkedInSourceInput(object(body).linkedinSource));
  }

  @Post("work-history/import")
  @HttpCode(200)
  async importWork(@Req() req: Request, @Body() body: unknown) {
    const user = await this.auth.requireUser(req);
    return this.pilot.importWork(user.id, workImportInput(body));
  }

  @Put("work-history/:id")
  @HttpCode(204)
  async editWork(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    await this.pilot.saveWork((await this.auth.requireUser(req)).id, id, workInput(body));
  }

  @Delete("work-history/:id")
  @HttpCode(204)
  async removeWork(@Req() req: Request, @Param("id", uuid) id: string) {
    await this.pilot.deleteWork((await this.auth.requireUser(req)).id, id);
  }

  @Put("linkedin-profile")
  @HttpCode(204)
  async setLinkedInProfile(@Req() req: Request, @Body() body: unknown) {
    const user = await this.auth.requireUser(req);
    const { url } = object(body);
    await this.pilot.setLinkedInProfile(user.id, url === null ? null : linkedInProfileUrl(url));
  }

  @Get("professionals/search")
  async search(
    @Req() req: Request,
    @Query("q") term: unknown,
    @Query("eligible") eligible: unknown,
    @Query("page") page: unknown,
  ) {
    const user = await this.auth.requireUser(req);
    if (eligible !== undefined && eligible !== "0" && eligible !== "1") {
      throw new BadRequestException("Invalid legacy search filter.");
    }
    const query = colleagueSearch(term);
    return this.pilot.search(user.id, query.term, pageNumber(page), query.profileUrl);
  }

  @Get("professionals/:id")
  async profile(@Req() req: Request, @Param("id", uuid) id: string) {
    return this.pilot.profile((await this.auth.requireUser(req)).id, id);
  }

  @Get("ratings/mine")
  async mine(@Req() req: Request) {
    return this.pilot.ratings((await this.auth.requireUser(req)).id);
  }

  @Get("ratings/reports/mine")
  async myReports(@Req() req: Request) {
    return this.pilot.reportsFiledBy((await this.auth.requireUser(req)).id);
  }

  @Post("ratings/received/opened")
  @HttpCode(204)
  async opened(@Req() req: Request, @Body() body: unknown) {
    const user = await this.auth.requireUser(req);
    const { ids } = object(body);
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 250 ||
      ids.some((id) => typeof id !== "string" || !uuidV4.test(id))) {
      throw new BadRequestException("Provide between 1 and 250 rating IDs.");
    }
    await this.pilot.openRatings(user.id, ids);
  }

  @Get("ratings/for/:id")
  async given(@Req() req: Request, @Param("id", uuid) id: string) {
    return { rating: await this.pilot.given((await this.auth.requireUser(req)).id, id) };
  }

  @Put("ratings/for/:id")
  async save(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    return this.pilot.saveRating((await this.auth.requireUser(req)).id, id, ratingInput(body));
  }

  @Post("ratings/:id/report")
  @HttpCode(204)
  async report(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    const user = await this.auth.requireUser(req);
    await this.pilot.report(user.id, id, text(object(body).reason, "Reason", 5, 1000));
  }

  @Get("moderation")
  async moderation(@Req() req: Request, @Query("status") status: unknown, @Query("page") pageValue: unknown) {
    await this.auth.requireOperator(req);
    if (status !== undefined && status !== "open" && status !== "resolved" && status !== "all") {
      throw new BadRequestException("Choose open or resolved reports.");
    }
    return this.pilot.moderation(status ?? "all", pageNumber(pageValue));
  }

  @Get("moderation/:id/history")
  async moderationHistory(@Req() req: Request, @Param("id", uuid) id: string) {
    await this.auth.requireOperator(req);
    return this.pilot.moderationHistory(id);
  }

  @Get("pilot/invitations")
  async invitations(@Req() req: Request) {
    await this.auth.requireOperator(req);
    return this.operations.invitations();
  }

  @Post("pilot/invitations")
  async invite(@Req() req: Request) {
    const operator = await this.auth.requireOperator(req);
    return this.operations.issueInvite("participant", operator.id);
  }

  @Delete("pilot/invitations/:id")
  @HttpCode(204)
  async revokeInvite(@Req() req: Request, @Param("id", uuid) id: string) {
    await this.auth.requireOperator(req);
    await this.operations.revokeInvite(id);
  }

  @Get("pilot/metrics")
  async metrics(@Req() req: Request) {
    await this.auth.requireOperator(req);
    return this.operations.metrics();
  }

  @Get("pilot/companies")
  async companies(@Req() req: Request, @Query("q") term: unknown, @Query("page") page: unknown) {
    await this.auth.requireOperator(req);
    return this.operations.companies(searchTerm(term), pageNumber(page));
  }

  @Post("pilot/companies/aliases/preview")
  @HttpCode(200)
  async previewCompanyAlias(@Req() req: Request, @Body() body: unknown) {
    await this.auth.requireOperator(req);
    const { canonical, alias } = object(body);
    return this.operations.previewCompanyAlias(text(canonical, "Company name", 1, 120), text(alias, "Alias", 1, 120));
  }

  @Post("pilot/companies/aliases")
  @HttpCode(200)
  async saveCompanyAlias(@Req() req: Request, @Body() body: unknown) {
    const operator = await this.auth.requireOperator(req);
    const { canonical, alias } = object(body);
    return this.operations.saveCompanyAlias(operator.id, text(canonical, "Company name", 1, 120), text(alias, "Alias", 1, 120));
  }

  @Get("pilot/accounts")
  async accounts(
    @Req() req: Request,
    @Query("q") term: unknown,
    @Query("suspended") suspended: unknown,
    @Query("page") page: unknown,
  ) {
    await this.auth.requireOperator(req);
    if (suspended !== undefined && suspended !== "1") {
      throw new BadRequestException("Choose all accounts or suspended accounts.");
    }
    return this.operations.accounts(searchTerm(term), suspended === "1", pageNumber(page));
  }

  @Get("pilot/accounts/:id/history")
  async accountHistory(@Req() req: Request, @Param("id", uuid) id: string) {
    await this.auth.requireOperator(req);
    return this.operations.accountHistory(id);
  }

  @Put("pilot/accounts/:id/access")
  @HttpCode(204)
  async accountAccess(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    const operator = await this.auth.requireOperator(req);
    const { suspended, note } = object(body);
    await this.operations.setAccountAccess(operator.id, id, boolean(suspended), text(note, "Internal reason", 3, 1000));
  }

  @Post("moderation/:id")
  @HttpCode(204)
  async moderate(@Req() req: Request, @Param("id", uuid) id: string, @Body() body: unknown) {
    const operator = await this.auth.requireOperator(req);
    const { action, note } = object(body);
    if (action !== "hide" && action !== "reinstate" && action !== "dismiss") {
      throw new BadRequestException("Choose a moderation decision.");
    }
    await this.pilot.moderate(operator.id, id, action, text(note, "Decision note", 3, 1000));
  }

  @Put("moderation/submissions")
  @HttpCode(204)
  async pause(@Req() req: Request, @Body() body: unknown) {
    await this.auth.requireOperator(req);
    await this.pilot.pause(boolean(object(body).paused));
  }
}
