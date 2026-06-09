import { Controller, Get, Inject } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
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
}
