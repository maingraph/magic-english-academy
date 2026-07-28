import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { Roles } from "../auth/roles.decorator";
import type { ApiSessionUser } from "../auth/auth.types";
import { FeedStorageService, type UploadedFeedFile } from "./feed-storage.service";
import {
  FeedService,
  type CreateFeedPostPayload,
  type FeedCommentPayload,
  type UpdateFeedPostPayload
} from "./feed.service";

@Controller("feed")
export class FeedController {
  constructor(
    @Inject(FeedService) private readonly feedService: FeedService,
    @Inject(FeedStorageService) private readonly storage: FeedStorageService
  ) {}

  @Get()
  list(@CurrentUser() user: ApiSessionUser, @Query("cursor") cursor?: string) {
    return this.feedService.list(user, cursor);
  }

  @Post("uploads")
  @Roles("teacher")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { files: 1, fileSize: 10 * 1024 * 1024 }
    })
  )
  upload(@UploadedFile() file: UploadedFeedFile) {
    return this.storage.store(file);
  }

  @Get("files/:storageKey")
  async file(
    @CurrentUser() user: ApiSessionUser,
    @Param("storageKey") storageKey: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const attachment = await this.feedService.openAttachment(user, storageKey);
    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(attachment.stream);
  }

  @Post()
  @Roles("teacher")
  create(@CurrentUser() user: ApiSessionUser, @Body() payload: CreateFeedPostPayload) {
    return this.feedService.create(user, payload);
  }

  @Patch(":postId")
  @Roles("teacher")
  update(
    @CurrentUser() user: ApiSessionUser,
    @Param("postId") postId: string,
    @Body() payload: UpdateFeedPostPayload
  ) {
    return this.feedService.update(user, postId, payload);
  }

  @Delete(":postId")
  @Roles("teacher")
  remove(@CurrentUser() user: ApiSessionUser, @Param("postId") postId: string) {
    return this.feedService.remove(user, postId);
  }

  @Post(":postId/like")
  like(@CurrentUser() user: ApiSessionUser, @Param("postId") postId: string) {
    return this.feedService.toggleLike(user, postId);
  }

  @Post(":postId/bookmark")
  bookmark(@CurrentUser() user: ApiSessionUser, @Param("postId") postId: string) {
    return this.feedService.toggleBookmark(user, postId);
  }

  @Post(":postId/view")
  view(@CurrentUser() user: ApiSessionUser, @Param("postId") postId: string) {
    return this.feedService.recordView(user, postId);
  }

  @Post(":postId/comments")
  comment(
    @CurrentUser() user: ApiSessionUser,
    @Param("postId") postId: string,
    @Body() payload: FeedCommentPayload
  ) {
    return this.feedService.addComment(user, postId, payload);
  }

  @Delete("comments/:commentId")
  removeComment(
    @CurrentUser() user: ApiSessionUser,
    @Param("commentId") commentId: string
  ) {
    return this.feedService.removeComment(user, commentId);
  }
}
