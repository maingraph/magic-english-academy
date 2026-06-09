import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: "magic-english-api",
      timestamp: new Date().toISOString()
    };
  }
}
