import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { LinkedInService } from "./linkedin.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, LinkedInService],
  exports: [AuthService],
})
export class AuthModule {}
