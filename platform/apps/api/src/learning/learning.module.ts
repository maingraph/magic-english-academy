import { Module } from "@nestjs/common";
import { GamificationModule } from "../gamification/gamification.module";
import { AdminHomeworkController, LearningController } from "./learning.controller";
import { LearningService } from "./learning.service";

@Module({
  imports: [GamificationModule],
  controllers: [LearningController, AdminHomeworkController],
  providers: [LearningService]
})
export class LearningModule {}
