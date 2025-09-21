import { Controller, Get, Logger } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);
  constructor(private readonly appService: AppService) {}

  @Get("health")
  health() {
    const payload = {
      status: "ok",
      uptime: process.uptime(),
      timestamp: Date.now(),
    };
    this.logger.debug(`Health check ok: uptime=${payload.uptime}`);
    return payload;
  }
}
