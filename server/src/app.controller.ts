import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Database } from "./database/database";

@Controller()
export class AppController {
  constructor(private readonly db: Database) {}

  @Get("health")
  async health() {
    try {
      await this.db.pool.query("SELECT 1 FROM pilot_settings LIMIT 1");
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
  }
}
