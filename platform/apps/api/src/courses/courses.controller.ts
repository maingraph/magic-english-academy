import { Controller, Get, Inject, Param } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { CoursesService } from "./courses.service";

@Controller("courses")
export class CoursesController {
  constructor(@Inject(CoursesService) private readonly coursesService: CoursesService) {}

  @Public()
  @Get("levels")
  async getLevels() {
    return this.coursesService.getLevels();
  }

  @Public()
  @Get("levels/:code")
  async getLevel(@Param("code") code: string) {
    return this.coursesService.getLevel(code);
  }

  @Public()
  @Get("levels/:code/lessons")
  async getLevelLessons(@Param("code") code: string) {
    return this.coursesService.getLevelLessons(code);
  }

  @Public()
  @Get("lessons/:slug")
  async getLesson(@Param("slug") slug: string) {
    return this.coursesService.getLesson(slug);
  }
}
