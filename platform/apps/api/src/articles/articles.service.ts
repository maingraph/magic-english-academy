import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ArticlesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getPublishedArticles() {
    return this.prisma.article.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true
      }
    });
  }

  async getPublishedArticle(slug: string) {
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        status: "PUBLISHED"
      },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        content: true,
        publishedAt: true,
        updatedAt: true
      }
    });

    if (!article) {
      throw new NotFoundException("Article not found");
    }

    return article;
  }
}
