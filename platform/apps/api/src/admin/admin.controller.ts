import { Body, Controller, Get, Inject, Param, Patch } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import type { AdminUpdateLessonPayload } from "./admin.service";
import { AdminService } from "./admin.service";

@Controller("admin")
@Roles("admin")
export class AdminController {
  constructor(@Inject(AdminService) private readonly adminService: AdminService) {}

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
