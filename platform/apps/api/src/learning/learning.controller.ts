import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import {
  LearningService,
  type AnswerTaskPayload,
  type ReviewHomeworkPayload,
  type SubmitHomeworkPayload
} from "./learning.service";

@Controller("learning")
export class LearningController {
  constructor(@Inject(LearningService) private readonly learningService: LearningService) {}

  @Post("lessons/:slug/answer")
  answerTask(
    @CurrentUser() user: ApiSessionUser,
    @Param("slug") slug: string,
    @Body() payload: AnswerTaskPayload
  ) {
    return this.learningService.answerTask(user, slug, payload);
  }

  @Post("lessons/:slug/homework")
  submitHomework(
    @CurrentUser() user: ApiSessionUser,
    @Param("slug") slug: string,
    @Body() payload: SubmitHomeworkPayload
  ) {
    return this.learningService.submitHomework(user, slug, payload);
  }

  @Get("homework")
  getMyHomework(@CurrentUser() user: ApiSessionUser) {
    return this.learningService.getMyHomework(user);
  }
}

@Controller("admin/homework")
@Roles("admin")
export class AdminHomeworkController {
  constructor(@Inject(LearningService) private readonly learningService: LearningService) {}

  @Get()
  getHomeworkQueue() {
    return this.learningService.getHomeworkQueue();
  }

  @Patch(":submissionId")
  reviewHomework(
    @CurrentUser() user: ApiSessionUser,
    @Param("submissionId") submissionId: string,
    @Body() payload: ReviewHomeworkPayload
  ) {
    return this.learningService.reviewHomework(user, submissionId, payload);
  }
}
