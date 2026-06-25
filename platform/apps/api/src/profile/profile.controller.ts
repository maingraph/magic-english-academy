import { Body, Controller, Get, Inject, Patch } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { ProfileService, type UpdateProfilePayload } from "./profile.service";

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
}
