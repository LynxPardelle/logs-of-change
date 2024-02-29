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
import { TLogSection } from '@src/log/types/logSection.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionDTO } from '@src/log/DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '@src/log/DTOs/updateLogSection.dto';
/* Services */
import { LogSectionService } from '@src/log/services/log-section.service';
import { LoggerService } from '@src/shared/services/logger.service';
@Controller('log-section')
export class LogSectionController {
  constructor(
    private _logSectionService: LogSectionService,
    private _loggerService: LoggerService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    this._loggerService.info('LogSectionController.author');
    return this._logSectionService.author();
  }
  @Post('')
  @Validate(CreateLogSectionDTO)
  async create(
    @Body() data: CreateLogSectionDTO,
    @Query('logId') logId: string,
  ) {
    this._loggerService.info(
      'LogSectionController.create',
      'LogSectionController',
    );
    const args = {
      logId: '',
    };
    if (logId) args['logId'] = logId;
    return await this._logSectionService.create(data, args);
  }
  @Get(':id')
  async read(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logSectionService.read(id);
  }
  @Get('')
  async readAll() {
    const args: TSearch<TLogSection> = undefined;
    return await this._logSectionService.readAll(args);
  }
  @Put('')
  @Validate(UpdateLogSectionDTO)
  async update(@Body() data: UpdateLogSectionDTO) {
    return await this._logSectionService.update(data);
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logSectionService.delete(id);
  }
}
