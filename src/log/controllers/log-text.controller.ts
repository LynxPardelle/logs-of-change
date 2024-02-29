import { Validate } from '@nestjs/class-validator';
import {
  Controller,
  Get,
  Delete,
  Param,
  Post,
  Put,
  Query,
  Body,
} from '@nestjs/common';
/* Types */
import { TLogText } from '@src/log/types/logText.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogTextDTO } from '@src/log/DTOs/createLogText.dto';
import { UpdateLogTextDTO } from '@src/log/DTOs/updateLogText.dto';
/* Services */
import { LogTextService } from '@src/log/services/log-text.service';
import { LoggerService } from '@src/shared/services/logger.service';
@Controller('log-text')
export class LogTextController {
  constructor(
    private _logTextService: LogTextService,
    private _loggerService: LoggerService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    this._loggerService.info('LogTextController.author');
    return this._logTextService.author();
  }
  @Post('')
  @Validate(CreateLogTextDTO)
  async create(
    @Body() data: CreateLogTextDTO,
    @Query('logSectionId') logSectionId: string,
  ) {
    this._loggerService.info('LogTextController.create', 'LogTextController');
    const args = {
      logSectionId: '',
    };
    if (logSectionId) args['logSectionId'] = logSectionId;
    return await this._logTextService.create(data, args);
  }
  @Get(':id')
  async read(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logTextService.read(id);
  }
  @Get('')
  async readAll() {
    const args: TSearch<TLogText> = undefined;
    return await this._logTextService.readAll(args);
  }
  @Put('')
  @Validate(UpdateLogTextDTO)
  async update(@Body() data: UpdateLogTextDTO) {
    return await this._logTextService.update(data);
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logTextService.delete(id);
  }
}
