import { Module } from '@nestjs/common';
/* Controllers */
import { LogController } from './controllers/log/log.controller';
/* Services */
import { LogService } from './services/log/log.service';

@Module({
  controllers: [LogController],
  providers: [LogService],
})
export class LogModule {}
