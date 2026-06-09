import { Module } from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { AuthController } from "./auth.controller";
import { RolesGuard } from "./roles.guard";

@Module({
  controllers: [AuthController],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: RolesGuard
    }
  ]
})
export class AuthModule {}
