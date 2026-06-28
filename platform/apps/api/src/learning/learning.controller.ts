import { Body, Controller, Inject, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import {
  LearningService,
  type AnswerTaskPayload
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
}
