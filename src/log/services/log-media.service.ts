import { Injectable } from '@nestjs/common';
/* Repositories */
import LogMediaRepository from '@src/log/repositories/logMedia.repository';
/* Types */
import { TLogMedia } from '@src/log/types/logMedia.type';
import { TLogMediaRepository } from '@src/log/types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogMediaDTO } from '@src/log/DTOs/createLogMedia.dto';
import { UpdateLogMediaDTO } from '@src/log/DTOs/updateLogMedia.dto';
@Injectable()
export class LogMediaService implements TLogMediaRepository {
  constructor(private _logMediaRepository: LogMediaRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
  /* Create */
  async create(
    data: CreateLogMediaDTO,
    args: { logSectionId: string },
  ): Promise<TRepositoryResponse<TLogMedia>> {
    return await this._logMediaRepository.create(data, args);
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogMedia>> {
    return await this._logMediaRepository.read(id);
  }
  async readAll(
    args?: TSearch<TLogMedia>,
  ): Promise<TRepositoryResponse<TLogMedia[]>> {
    return await this._logMediaRepository.readAll(args);
  }
  /* Update */
  async update(
    data: UpdateLogMediaDTO,
  ): Promise<TRepositoryResponse<TLogMedia>> {
    return await this._logMediaRepository.update(data);
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogMedia>> {
    return await this._logMediaRepository.delete(id);
  }
}
