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
import { TLogMedia } from '@src/log/types/logMedia.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogMediaDTO } from '@src/log/DTOs/createLogMedia.dto';
import { UpdateLogMediaDTO } from '@src/log/DTOs/updateLogMedia.dto';
/* Services */
import { LogMediaService } from '@src/log/services/log-media.service';
import { LoggerService } from '@src/shared/services/logger.service';
@Controller('log-media')
export class LogMediaController {
  constructor(
    private _logMediaService: LogMediaService,
    private _loggerService: LoggerService,
  ) {}
  @Get('author')
  author(): { [key: string]: string } {
    this._loggerService.info('LogMediaController.author');
    return this._logMediaService.author();
  }
  @Post('')
  @Validate(CreateLogMediaDTO)
  async create(
    @Body() data: CreateLogMediaDTO,
    @Query('logSectionId') logSectionId: string,
  ) {
    this._loggerService.info('LogMediaController.create', 'LogMediaController');
    const args = {
      logSectionId: '',
    };
    if (logSectionId) args['logSectionId'] = logSectionId;
    return await this._logMediaService.create(data, args);
  }
  @Get(':id')
  async read(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logMediaService.read(id);
  }
  @Get('')
  async readAll() {
    const args: TSearch<TLogMedia> = undefined;
    return await this._logMediaService.readAll(args);
  }
  @Put('')
  @Validate(UpdateLogMediaDTO)
  async update(@Body() data: UpdateLogMediaDTO) {
    return await this._logMediaService.update(data);
  }
  @Delete(':id')
  async delete(@Param('id') id: string) {
    if (!id) throw new Error('Id is required');
    return await this._logMediaService.delete(id);
  }
}
