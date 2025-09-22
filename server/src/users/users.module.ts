import { Module, forwardRef } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { AuthModule } from "../auth/auth.module";
import { RatingsModule } from "../ratings/ratings.module";

@Module({
  imports: [forwardRef(() => AuthModule), RatingsModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
