import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  RawBodyRequest,
  Req,
  Res,
  StreamableFile
} from "@nestjs/common";
import type { Request, Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { ExperienceEmailService } from "./experience-email.service";
import { ExperienceService } from "./experience.service";
import { ExperienceStorageService } from "./experience-storage.service";

type Payload = Record<string, unknown>;

@Controller()
export class ExperienceController {
  constructor(
    @Inject(ExperienceService) private readonly experience: ExperienceService,
    @Inject(ExperienceStorageService) private readonly storage: ExperienceStorageService
  ) {}

  @Get("dashboard")
  dashboard(@CurrentUser() user: ApiSessionUser) {
    return this.experience.dashboard(user);
  }

  @Get("search")
  search(@CurrentUser() user: ApiSessionUser, @Query("q") query?: string) {
    return this.experience.search(user, query);
  }

  @Get("study-plan")
  studyPlan(@CurrentUser() user: ApiSessionUser) {
    return this.experience.getStudyPlan(user);
  }

  @Patch("study-plan")
  updateStudyPlan(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.experience.updateStudyPlan(user, payload);
  }

  @Get("calendar/events")
  calendar(@CurrentUser() user: ApiSessionUser, @Query("from") from?: string, @Query("to") to?: string) {
    return this.experience.calendar(user, from, to);
  }

  @Post("calendar/events")
  createEvent(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.experience.createCalendarEvent(user, payload);
  }

  @Patch("calendar/events/:eventId")
  updateEvent(@CurrentUser() user: ApiSessionUser, @Param("eventId") eventId: string, @Body() payload: Payload) {
    return this.experience.updateCalendarEvent(user, eventId, payload);
  }

  @Delete("calendar/events/:eventId")
  removeEvent(@CurrentUser() user: ApiSessionUser, @Param("eventId") eventId: string) {
    return this.experience.removeCalendarEvent(user, eventId);
  }

  @Get("notifications")
  notifications(@CurrentUser() user: ApiSessionUser, @Query("unread") unread?: string) {
    return this.experience.notifications(user, unread === "true");
  }

  @Patch("notifications/read-all")
  readAll(@CurrentUser() user: ApiSessionUser) {
    return this.experience.readAllNotifications(user);
  }

  @Patch("notifications/:notificationId/read")
  readNotification(@CurrentUser() user: ApiSessionUser, @Param("notificationId") notificationId: string) {
    return this.experience.readNotification(user, notificationId);
  }

  @Get("notifications/preferences")
  notificationPreferences(@CurrentUser() user: ApiSessionUser) {
    return this.experience.notificationPreferences(user);
  }

  @Patch("notifications/preferences")
  updateNotificationPreferences(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.experience.updateNotificationPreferences(user, payload);
  }

  @Get("training/due")
  dueTraining(@CurrentUser() user: ApiSessionUser, @Query("limit") limit?: string) {
    return this.experience.dueTraining(user, limit);
  }

  @Post("training/sessions")
  startTraining(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.experience.startTraining(user, payload);
  }

  @Post("training/sessions/:sessionId/answers")
  answerTraining(
    @CurrentUser() user: ApiSessionUser,
    @Param("sessionId") sessionId: string,
    @Body() payload: Payload
  ) {
    return this.experience.answerTraining(user, sessionId, payload);
  }

  @Post("training/sessions/:sessionId/complete")
  completeTraining(@CurrentUser() user: ApiSessionUser, @Param("sessionId") sessionId: string) {
    return this.experience.completeTraining(user, sessionId);
  }

  @Get("library")
  library(
    @CurrentUser() user: ApiSessionUser,
    @Query("q") query?: string,
    @Query("type") type?: string,
    @Query("saved") saved?: string
  ) {
    return this.experience.library(user, { query, type, saved: saved === "true" });
  }

  @Post("library/:materialId/save")
  saveMaterial(@CurrentUser() user: ApiSessionUser, @Param("materialId") materialId: string) {
    return this.experience.toggleMaterialSave(user, materialId, true);
  }

  @Delete("library/:materialId/save")
  unsaveMaterial(@CurrentUser() user: ApiSessionUser, @Param("materialId") materialId: string) {
    return this.experience.toggleMaterialSave(user, materialId, false);
  }

  @Get("speaking-clubs")
  speakingClubs(@CurrentUser() user: ApiSessionUser) {
    return this.experience.speakingClubs(user);
  }

  @Post("speaking-clubs/:clubId/book")
  bookClub(@CurrentUser() user: ApiSessionUser, @Param("clubId") clubId: string) {
    return this.experience.bookSpeakingClub(user, clubId);
  }

  @Delete("speaking-clubs/:clubId/book")
  cancelClub(@CurrentUser() user: ApiSessionUser, @Param("clubId") clubId: string) {
    return this.experience.cancelSpeakingClub(user, clubId);
  }

  @Get("certificates")
  certificates(@CurrentUser() user: ApiSessionUser) {
    return this.experience.certificates(user);
  }

  @Get("certificates/:certificateId/download")
  async certificateDownload(
    @CurrentUser() user: ApiSessionUser,
    @Param("certificateId") certificateId: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const document = await this.experience.certificateDocument(user, certificateId);
    response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="magic-english-${document.level}.svg"`);
    return new StreamableFile(Buffer.from(document.svg));
  }

  @Post("lessons/:slug/bookmark")
  bookmarkLesson(@CurrentUser() user: ApiSessionUser, @Param("slug") slug: string) {
    return this.experience.toggleLessonBookmark(user, slug, true);
  }

  @Delete("lessons/:slug/bookmark")
  unbookmarkLesson(@CurrentUser() user: ApiSessionUser, @Param("slug") slug: string) {
    return this.experience.toggleLessonBookmark(user, slug, false);
  }

  @Post("lessons/:slug/reaction")
  reactLesson(@CurrentUser() user: ApiSessionUser, @Param("slug") slug: string, @Body() payload: Payload) {
    return this.experience.reactToLesson(user, slug, payload);
  }

  @Post("feed/polls/:pollId/vote")
  vote(@CurrentUser() user: ApiSessionUser, @Param("pollId") pollId: string, @Body() payload: Payload) {
    return this.experience.voteInPoll(user, pollId, payload);
  }

  @Post("storage/upload-token")
  uploadToken(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.storage.createUploadToken(user, payload);
  }

  @Post("storage/finalize")
  finalizeUpload(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.storage.finalize(user, payload);
  }

  @Get("storage/:assetId/download")
  download(@CurrentUser() user: ApiSessionUser, @Param("assetId") assetId: string) {
    return this.storage.download(user, assetId);
  }

  @Delete("storage/:assetId")
  removeAsset(@CurrentUser() user: ApiSessionUser, @Param("assetId") assetId: string) {
    return this.storage.remove(user, assetId);
  }
}

@Controller("admin/experience")
@Roles("admin", "owner")
export class ExperienceAdminController {
  constructor(@Inject(ExperienceService) private readonly experience: ExperienceService) {}

  @Get("analytics")
  analytics() {
    return this.experience.adminAnalytics();
  }

  @Post("campaigns")
  campaign(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.experience.createCampaign(user, payload);
  }

  @Get("campaigns")
  campaigns() {
    return this.experience.adminCampaigns();
  }

  @Post("speaking-clubs")
  createClub(@Body() payload: Payload) {
    return this.experience.adminCreateSpeakingClub(payload);
  }

  @Patch("speaking-clubs/:clubId")
  updateClub(@Param("clubId") clubId: string, @Body() payload: Payload) {
    return this.experience.adminUpdateSpeakingClub(clubId, payload);
  }

  @Get("speaking-clubs")
  clubs() {
    return this.experience.adminSpeakingClubs();
  }

  @Patch("speaking-clubs/:clubId/bookings/:bookingId")
  attendance(@Param("clubId") clubId: string, @Param("bookingId") bookingId: string, @Body() payload: Payload) {
    return this.experience.adminUpdateAttendance(clubId, bookingId, payload);
  }

  @Post("library")
  createMaterial(@CurrentUser() user: ApiSessionUser, @Body() payload: Payload) {
    return this.experience.adminCreateMaterial(user, payload);
  }

  @Patch("library/:materialId")
  updateMaterial(@Param("materialId") materialId: string, @Body() payload: Payload) {
    return this.experience.adminUpdateMaterial(materialId, payload);
  }

  @Get("library")
  materials() {
    return this.experience.adminLibrary();
  }

  @Patch("certificates/:certificateId/revoke")
  revokeCertificate(@Param("certificateId") certificateId: string) {
    return this.experience.revokeCertificate(certificateId);
  }
}

@Controller("public")
export class ExperiencePublicController {
  constructor(
    @Inject(ExperienceService) private readonly experience: ExperienceService,
    @Inject(ExperienceEmailService) private readonly email: ExperienceEmailService
  ) {}

  @Public()
  @Get("certificates/:token")
  verifyCertificate(@Param("token") token: string) {
    return this.experience.verifyCertificate(token);
  }

  @Public()
  @Post("webhooks/resend")
  resendWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers("svix-id") id?: string,
    @Headers("svix-timestamp") timestamp?: string,
    @Headers("svix-signature") signature?: string
  ) {
    return this.email.processWebhook(request.rawBody, { id, timestamp, signature });
  }
}

@Controller("internal/jobs")
export class ExperienceJobsController {
  constructor(@Inject(ExperienceService) private readonly experience: ExperienceService) {}

  @Public()
  @Get("dispatch")
  dispatch(@Headers("authorization") authorization?: string) {
    return this.experience.dispatchScheduledWork(authorization);
  }
}
