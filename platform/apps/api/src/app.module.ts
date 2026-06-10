import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { HealthModule } from "./health/health.module";
import { ProgressModule } from "./progress/progress.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, CoursesModule, AdminModule, ProgressModule]
})
export class AppModule {}
