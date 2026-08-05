import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AdminModule } from "./admin/admin.module";
import { AssistantModule } from "./assistant/assistant.module";
import { ArticlesModule } from "./articles/articles.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { HealthModule } from "./health/health.module";
import { DictionaryModule } from "./dictionary/dictionary.module";
import { FeedModule } from "./feed/feed.module";
import { ExperienceModule } from "./experience/experience.module";
import { GamificationModule } from "./gamification/gamification.module";
import { LearningModule } from "./learning/learning.module";
import { NotesModule } from "./notes/notes.module";
import { PaymentsModule } from "./payments/payments.module";
import { ProfileModule } from "./profile/profile.module";
import { ProgressModule } from "./progress/progress.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120
      }
    ]),
    PrismaModule,
    AuthModule,
    HealthModule,
    CoursesModule,
    AdminModule,
    AssistantModule,
    ArticlesModule,
    ProgressModule,
    ProfileModule,
    DictionaryModule,
    FeedModule,
    ExperienceModule,
    GamificationModule,
    LearningModule,
    NotesModule,
    PaymentsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
