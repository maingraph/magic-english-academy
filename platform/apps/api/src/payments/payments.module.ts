import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AlfaClient } from "./alfa.client";
import { PaymentsAdminController, PaymentsController, PaymentsJobsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentsAdminController, PaymentsJobsController],
  providers: [AlfaClient, PaymentsService]
})
export class PaymentsModule {}
