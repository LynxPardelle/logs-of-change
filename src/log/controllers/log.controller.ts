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
import { TLog } from '@src/log/types/log.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogDTO } from '@src/log/DTOs/createLog.dto';
import { UpdateLogDTO } from '@src/log/DTOs/updateLog.dto';
/* Services */
import { LogService } from '@src/log/services/log.service';
import { LoggerService } from '@src/shared/services/logger.service';

@Controller('log')
export class LogController {
  constructor(
    private _logService: LogService,
    private _loggerService: LoggerService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    this._loggerService.info('LogController.author');
    return this._logService.author();
  }
  @Post('')
  @Validate(CreateLogDTO)
  async create(
    @Body() data: CreateLogDTO,
    @Query('changeLogId') changeLogId: string,
  ) {
    this._loggerService.info('LogController.create', 'LogController');
    const args = {
      changeLogId: '',
    };
    if (changeLogId) args['changeLogId'] = changeLogId;
    this._loggerService.info(
      `data: ${JSON.stringify(data)}`,
      'LogController.create',
    );
    this._loggerService.info(
      `args: ${JSON.stringify(args)}`,
      'LogController.create',
    );
    return await this._logService.create(data, args);
  }
  @Get(':id')
  async read(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logService.read(id);
  }
  @Get('')
  async readAll() {
    const args: TSearch<TLog> = undefined;
    return await this._logService.readAll(args);
  }
  @Put('')
  @Validate(UpdateLogDTO)
  async update(@Body() data: UpdateLogDTO) {
    return await this._logService.update(data);
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this._logService.delete(id);
  }
}
