import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { AppModule } from "./app.module";

for (const envPath of [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env")
]) {
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
    break;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const webOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" }
    })
  );
  app.useBodyParser("json", { limit: "1mb" });
  app.enableShutdownHooks();
  const server = app.getHttpAdapter().getInstance() as {
    disable: (name: string) => void;
    set: (name: string, value: unknown) => void;
  };
  server.disable("x-powered-by");
  server.set("trust proxy", 1);
  app.enableCors({
    origin: webOrigins,
    credentials: true
  });
  app.setGlobalPrefix("api");

  await app.listen(port);
  console.log(`Magic English API running on http://localhost:${port}/api`);
}

bootstrap();
