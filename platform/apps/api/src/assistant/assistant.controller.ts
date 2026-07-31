import { Body, Controller, Delete, Get, Inject, Param, Post, Query } from "@nestjs/common";
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

  @Get("sessions")
  sessions(@CurrentUser() user: ApiSessionUser) {
    return this.assistantService.listSessions(user);
  }

  @Post("sessions")
  createSession(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: { title?: unknown; lessonSlug?: unknown }
  ) {
    return this.assistantService.createSession(user, payload);
  }

  @Get("sessions/:sessionId")
  session(@CurrentUser() user: ApiSessionUser, @Param("sessionId") sessionId: string) {
    return this.assistantService.getSession(user, sessionId);
  }

  @Delete("sessions/:sessionId")
  archive(@CurrentUser() user: ApiSessionUser, @Param("sessionId") sessionId: string) {
    return this.assistantService.archiveSession(user, sessionId);
  }

  @Post("run")
  runAction(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: AssistantActionPayload
  ) {
    return this.assistantService.runAction(user, payload);
  }
}
