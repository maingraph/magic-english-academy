import { Body, Controller, Get, Inject, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import {
  ProfileService,
  type ChangePasswordPayload,
  type UpdateProfilePayload
} from "./profile.service";

@Controller("profile")
export class ProfileController {
  constructor(@Inject(ProfileService) private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: ApiSessionUser) {
    return this.profileService.getProfile(user);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: UpdateProfilePayload
  ) {
    return this.profileService.updateProfile(user, payload);
  }

  @Patch("password")
  changePassword(
    @CurrentUser() user: ApiSessionUser,
    @Body() payload: ChangePasswordPayload
  ) {
    return this.profileService.changePassword(user, payload);
  }

  @Post("activity/visit")
  recordVisit(@CurrentUser() user: ApiSessionUser) {
    return this.profileService.recordVisit(user);
  }

  @Get("activity")
  getActivity(
    @CurrentUser() user: ApiSessionUser,
    @Query("months") months?: string
  ) {
    return this.profileService.getActivity(user, months);
  }
}
