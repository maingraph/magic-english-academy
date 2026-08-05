import { Body, Controller, Get, Headers, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../auth/public.decorator";
import { Roles } from "../auth/roles.decorator";
import { PaymentsService } from "./payments.service";
import type { CreatePaymentPayload } from "./payments.utils";

@Public()
@Controller("payments")
@Throttle({ default: { limit: 12, ttl: 60_000 } })
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post("orders")
  create(@Body() payload: CreatePaymentPayload) {
    return this.payments.create(payload);
  }

  @Get("orders/:token")
  status(@Param("token") token: string) {
    return this.payments.status(token);
  }
}

@Controller("admin/payments")
@Roles("admin", "owner")
export class PaymentsAdminController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Get()
  list(@Query("status") status?: string, @Query("email") email?: string) {
    return this.payments.list(status, email);
  }

  @Post(":id/refresh")
  refresh(@Param("id") id: string) {
    return this.payments.adminRefresh(id);
  }

  @Patch(":id/fulfilled")
  fulfilled(@Param("id") id: string, @Body() payload: { fulfilled?: unknown }) {
    return this.payments.setFulfilled(id, payload.fulfilled === true);
  }
}

@Public()
@Controller("internal/jobs/payments")
export class PaymentsJobsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Get("reconcile")
  reconcile(@Headers("authorization") authorization?: string) {
    return this.payments.reconcile(authorization);
  }
}
