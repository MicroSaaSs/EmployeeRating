import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.enableCors({ origin: true, credentials: true });
  app.use(cookieParser());
  app.use((req: { method: any; url: any }, _res: any, next: () => void) => {
    Logger.log(`${req.method} ${req.url}`, "HTTP");
    next();
  });
  const logger = new Logger("Bootstrap");
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  logger.log(`Server listening on http://localhost:${port}`);
}
bootstrap();
