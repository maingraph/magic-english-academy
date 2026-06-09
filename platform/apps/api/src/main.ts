import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);

  app.enableCors({
    origin: webOrigin,
    credentials: true
  });
  app.setGlobalPrefix("api");

  await app.listen(port);
  console.log(`Magic English API running on http://localhost:${port}/api`);
}

bootstrap();
