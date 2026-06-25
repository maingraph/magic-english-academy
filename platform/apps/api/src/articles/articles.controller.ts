import { Controller, Get, Inject, Param } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { ArticlesService } from "./articles.service";

@Controller("articles")
@Public()
export class ArticlesController {
  constructor(@Inject(ArticlesService) private readonly articlesService: ArticlesService) {}

  @Get()
  getPublishedArticles() {
    return this.articlesService.getPublishedArticles();
  }

  @Get(":slug")
  getPublishedArticle(@Param("slug") slug: string) {
    return this.articlesService.getPublishedArticle(slug);
  }
}
