import { Controller, Get, Inject, Query } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { GamificationService } from "./gamification.service";

@Controller("gamification")
export class GamificationController {
  constructor(
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService
  ) {}

  @Get("leaderboard")
  getLeaderboard(
    @CurrentUser() user: ApiSessionUser,
    @Query("period") period?: string
  ) {
    return this.gamificationService.getLeaderboard(user, period);
  }

  @Get("achievements")
  getAchievements(@CurrentUser() user: ApiSessionUser) {
    return this.gamificationService.getAchievements(user);
  }
}
