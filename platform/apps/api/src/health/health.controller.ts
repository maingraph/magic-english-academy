import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      ok: true,
      service: "magic-english-api",
      timestamp: new Date().toISOString()
    };
  }
}
