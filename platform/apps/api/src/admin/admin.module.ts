import { Module } from "@nestjs/common";
import { AssistantModule } from "../assistant/assistant.module";
import { CoursesModule } from "../courses/courses.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [CoursesModule, AssistantModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
