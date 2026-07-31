import { Module } from "@nestjs/common";
import {
  ExperienceAdminController,
  ExperienceController,
  ExperienceJobsController,
  ExperiencePublicController
} from "./experience.controller";
import { ExperienceEmailService } from "./experience-email.service";
import { ExperienceService } from "./experience.service";
import { ExperienceStorageService } from "./experience-storage.service";

@Module({
  controllers: [
    ExperienceController,
    ExperienceAdminController,
    ExperiencePublicController,
    ExperienceJobsController
  ],
  providers: [ExperienceService, ExperienceStorageService, ExperienceEmailService],
  exports: [ExperienceService]
})
export class ExperienceModule {}
