import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database";
import { PilotController } from "./pilot/pilot.controller";
import { PilotOperationsService } from "./pilot/operations.service";
import { PilotService } from "./pilot/pilot.service";
import { ColleagueDraftsService } from "./pilot/colleague-drafts.service";
import { ColleagueProfilesService } from "./pilot/colleague-profiles.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule],
  controllers: [AppController, PilotController],
  providers: [PilotService, PilotOperationsService, ColleagueDraftsService, ColleagueProfilesService],
})
export class AppModule {}
