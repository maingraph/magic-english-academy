import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { AssistantService, type AssistantActionPayload } from "./assistant.service";

@Controller("assistant")
export class AssistantController {
  constructor(
    @Inject(AssistantService) private readonly assistantService: AssistantService
  ) {}

  @Get("status")
  getStatus(
    @CurrentUser() user: ApiSessionUser,
    @Query("lessonSlug") lessonSlug?: string
  ) {
    return this.assistantService.getStatus(user, lessonSlug);
  }

  @Get("context")
  getContext(@CurrentUser() user: ApiSessionUser) {
    return this.assistantService.getContext(user);
  }

  @Get("history")
  getHistory(
    @CurrentUser() user: ApiSessionUser,
    @Query("lessonSlug") lessonSlug?: string
  ) {
    return this.assistantService.getHistory(user, lessonSlug);
  }

  @Post("run")
  runAction(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: AssistantActionPayload
  ) {
    return this.assistantService.runAction(user, payload);
  }
}
