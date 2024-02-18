import { Module } from '@nestjs/common';
import { AppController } from './core/controllers/app.controller';
import { AppService } from './core/services/app.service';
/* Modules */
import { LogModule } from './log/log.module';

@Module({
  imports: [LogModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
