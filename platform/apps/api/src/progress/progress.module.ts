import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { GamificationModule } from "../gamification/gamification.module";
import { ProgressController } from "./progress.controller";
import { ProgressService } from "./progress.service";

@Module({
  imports: [PrismaModule, GamificationModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService]
})
export class ProgressModule {}
