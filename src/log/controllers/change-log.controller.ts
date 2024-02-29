import { Validate } from '@nestjs/class-validator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
/* Types */
import { TChangeLog } from '@src/log/types/changeLog.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateChangeLogDTO } from '@src/log/DTOs/createChangeLog.dto';
import { UpdateChangeLogDTO } from '@src/log/DTOs/updateChangeLog.dto';
/* Services */
import { ChangeLogService } from '@src/log/services/change-log.service';
import { LoggerService } from '@src/shared/services/logger.service';

@Controller('change-log')
export class ChangeLogController {
  constructor(
    private _changeLogService: ChangeLogService,
    private _loggerService: LoggerService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    this._loggerService.info('ChangeLogController.author');
    return this._changeLogService.author();
  }
  @Post('')
  @Validate(CreateChangeLogDTO)
  async create(
    @Body() data: CreateChangeLogDTO,
    @Query('projectId') projectId: string,
  ) {
    this._loggerService.info(
      'ChangeLogController.create',
      'ChangeLogController',
    );
    const args = {
      projectId: '',
    };
    if (projectId) args['projectId'] = projectId;
    return await this._changeLogService.create(data, args);
  }

  @Get(':id')
  async read(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._changeLogService.read(id);
  }

  @Get('')
  async readAll() {
    const args: TSearch<TChangeLog> = undefined;
    return await this._changeLogService.readAll(args);
  }

  @Put('')
  @Validate(UpdateChangeLogDTO)
  async update(@Body() data: UpdateChangeLogDTO) {
    return await this._changeLogService.update(data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this._changeLogService.delete(id);
  }
}
