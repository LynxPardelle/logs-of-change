import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TConfig } from '@src/config/config.type';
/* Services */
import { LogService } from '@src/log/services/log.service';

@Controller('log')
export class LogController {
  constructor(
    private _logService: LogService,
    private _configService: ConfigService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    console.log('LogController.author');
    return this._logService.author();
  }
}
