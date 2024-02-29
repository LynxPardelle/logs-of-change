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
import { TLogSectionType } from '@src/log/types/logSectionType.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionTypeDTO } from '@src/log/DTOs/createLogSectionType.dto';
import { UpdateLogSectionTypeDTO } from '@src/log/DTOs/updateLogSectionType.dto';
/* Services */
import { LogSectionTypeService } from '@src/log/services/log-section-type.service';
import { LoggerService } from '@src/shared/services/logger.service';
@Controller('log-section-type')
export class LogSectionTypeController {
  constructor(
    private _logSectionTypeService: LogSectionTypeService,
    private _loggerService: LoggerService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    this._loggerService.info('LogSectionTypeController.author');
    return this._logSectionTypeService.author();
  }
  @Post('')
  @Validate(CreateLogSectionTypeDTO)
  async create(@Body() data: CreateLogSectionTypeDTO) {
    this._loggerService.info(
      'LogSectionTypeController.create',
      'LogSectionTypeController',
    );
    return await this._logSectionTypeService.create(data);
  }
  @Get(':id')
  async read(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logSectionTypeService.read(id);
  }
  @Get('')
  async readAll() {
    const args: TSearch<TLogSectionType> = undefined;
    return await this._logSectionTypeService.readAll(args);
  }
  @Put('')
  @Validate(UpdateLogSectionTypeDTO)
  async update(@Body() data: UpdateLogSectionTypeDTO) {
    return await this._logSectionTypeService.update(data);
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logSectionTypeService.delete(id);
  }
}
