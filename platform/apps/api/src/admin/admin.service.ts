import { Inject, Injectable } from "@nestjs/common";
import { CoursesService } from "../courses/courses.service";

@Injectable()
export class AdminService {
  constructor(@Inject(CoursesService) private readonly coursesService: CoursesService) {}

  async getOverview() {
    const courseInventory = await this.coursesService.getLevels();

    return {
      metrics: [
        {
          label: "Legacy course items",
          value: String(courseInventory.totalLessons),
          tone: "neutral"
        },
        {
          label: "Native lessons",
          value: courseInventory.source === "database" ? String(courseInventory.totalLessons) : "0",
          tone: courseInventory.source === "database" ? "good" : "warning"
        },
        {
          label: "Active roles",
          value: "4",
          tone: "good"
        }
      ],
      nativeMigrationPercent: courseInventory.source === "database" ? 100 : 0,
      riskSignals: [
        {
          label: "Shared-account signals",
          count: 0,
          tone: "neutral"
        },
        {
          label: "Toxic messages",
          count: 0,
          tone: "neutral"
        }
      ]
    };
  }
}
