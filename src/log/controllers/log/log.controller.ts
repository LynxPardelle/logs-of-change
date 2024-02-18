import { Controller, Get } from '@nestjs/common';
/* Services */
import { LogService } from 'src/log/services/log/log.service';

@Controller('log')
export class LogController {
  constructor(private _logService: LogService) {}
  @Get()
  author(): { [key: string]: string } {
    return this._logService.author();
  }
}
