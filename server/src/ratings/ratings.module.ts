import { Module, forwardRef } from "@nestjs/common";
import { RatingsService } from "./ratings.service";
import { RatingsController } from "./ratings.controller";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [RatingsService],
  controllers: [RatingsController],
  exports: [RatingsService],
})
export class RatingsModule {}
