import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { ProgressService } from "./progress.service";

@Controller("progress")
export class ProgressController {
  constructor(@Inject(ProgressService) private readonly progressService: ProgressService) {}

  @Get("summary")
  async getSummary(@CurrentUser() user: ApiSessionUser) {
    return this.progressService.getSummary(user);
  }

  @Get("placement-test")
  getPlacementTest() {
    return this.progressService.getPlacementTest();
  }

  @Post("placement-test")
  submitPlacementTest(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: { answers?: unknown }
  ) {
    return this.progressService.submitPlacementTest(user, payload.answers);
  }

  @Get("levels/:code")
  async getLevelProgress(
    @CurrentUser() user: ApiSessionUser,
    @Param("code") code: string
  ) {
    return this.progressService.getLevelProgress(user, code);
  }

  @Post("lessons/:slug/start")
  async startLesson(
    @CurrentUser() user: ApiSessionUser,
    @Param("slug") slug: string
  ) {
    return this.progressService.markLessonStarted(user, slug);
  }

  @Post("lessons/:slug/complete")
  async completeLesson(
    @CurrentUser() user: ApiSessionUser,
    @Param("slug") slug: string
  ) {
    return this.progressService.markLessonCompleted(user, slug);
  }
}
