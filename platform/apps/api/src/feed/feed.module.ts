import { Module } from "@nestjs/common";
import { FeedController } from "./feed.controller";
import { FeedStorageService } from "./feed-storage.service";
import { FeedService } from "./feed.service";

@Module({
  controllers: [FeedController],
  providers: [FeedService, FeedStorageService]
})
export class FeedModule {}
