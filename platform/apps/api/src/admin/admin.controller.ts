import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { AssistantService, type AssistantTestPayload } from "../assistant/assistant.service";
import type {
  AdminArticlePayload,
  AdminAssistantSettingsPayload,
  AdminCreateDictionaryTermPayload,
  AdminCreateUserPayload,
  AdminCreateLessonPayload,
  AdminModulePayload,
  AdminMoveLessonPayload,
  AdminUpdateLessonPayload
} from "./admin.service";
import { AdminService } from "./admin.service";

@Controller("admin")
@Roles("admin")
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService,
    @Inject(AssistantService) private readonly assistantService: AssistantService
  ) {}

  @Get("overview")
  async getOverview(@CurrentUser() user: ApiSessionUser) {
    return {
      viewer: user,
      ...(await this.adminService.getOverview())
    };
  }

  @Get("course-map")
  async getCourseMap() {
    return this.adminService.getCourseMap();
  }

  @Post("modules")
  createModule(@Body() payload: AdminModulePayload) {
    return this.adminService.createModule(payload);
  }

  @Patch("modules/:moduleId")
  updateModule(
    @Param("moduleId") moduleId: string,
    @Body() payload: AdminModulePayload
  ) {
    return this.adminService.updateModule(moduleId, payload);
  }

  @Delete("modules/:moduleId")
  deleteModule(@Param("moduleId") moduleId: string) {
    return this.adminService.deleteModule(moduleId);
  }

  @Post("lessons")
  createLesson(@Body() payload: AdminCreateLessonPayload) {
    return this.adminService.createLesson(payload);
  }

  @Patch("lessons/:slug/move")
  moveLesson(
    @Param("slug") slug: string,
    @Body() payload: AdminMoveLessonPayload
  ) {
    return this.adminService.moveLesson(slug, payload);
  }

  @Delete("lessons/:slug")
  deleteLesson(@Param("slug") slug: string) {
    return this.adminService.deleteLesson(slug);
  }

  @Get("users")
  async getUsers(@Query("q") query?: string) {
    return this.adminService.getUsers(query);
  }

  @Post("users")
  async createUser(@Body() payload: AdminCreateUserPayload) {
    return this.adminService.createUser(payload);
  }

  @Get("activity")
  async getActivity() {
    return this.adminService.getActivity();
  }

  @Get("articles")
  async getArticles() {
    return this.adminService.getArticles();
  }

  @Post("articles")
  async createArticle(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: AdminArticlePayload
  ) {
    return this.adminService.createArticle(user, payload);
  }

  @Patch("articles/:articleId")
  async updateArticle(
    @Param("articleId") articleId: string,
    @Body() payload: AdminArticlePayload
  ) {
    return this.adminService.updateArticle(articleId, payload);
  }

  @Get("settings")
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Patch("settings/assistant")
  async updateAssistantSettings(@Body() payload: AdminAssistantSettingsPayload) {
    return this.adminService.updateAssistantSettings(payload);
  }

  @Post("settings/assistant/test")
  async testAssistantSettings(@Body() payload: AssistantTestPayload) {
    return this.assistantService.testConnection(payload);
  }

  @Get("dictionary")
  async getDictionary(@Query("q") query?: string) {
    return this.adminService.getDictionary(query);
  }

  @Post("dictionary")
  async createDictionaryTerm(@Body() payload: AdminCreateDictionaryTermPayload) {
    return this.adminService.createDictionaryTerm(payload);
  }

  @Get("lessons/:slug")
  async getLessonForEdit(@Param("slug") slug: string) {
    return this.adminService.getLessonForEdit(slug);
  }

  @Patch("lessons/:slug")
  async updateLesson(
    @Param("slug") slug: string,
    @Body() payload: AdminUpdateLessonPayload
  ) {
    return this.adminService.updateLesson(slug, payload);
  }
}
