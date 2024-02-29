import { Injectable } from '@nestjs/common';
/* Repositories */
import LogSectionRepository from '@src/log/repositories/logSection.repository';
/* Types */
import { TLogSection } from '@src/log/types/logSection.type';
import { TLogSectionRepository } from '@src/log/types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionDTO } from '@src/log/DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '@src/log/DTOs/updateLogSection.dto';
@Injectable()
export class LogSectionService implements TLogSectionRepository {
  constructor(private _logSectionRepository: LogSectionRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
  /* Create */
  async create(
    data: CreateLogSectionDTO,
    args: { logId: string },
  ): Promise<TRepositoryResponse<TLogSection>> {
    return await this._logSectionRepository.create(data, args);
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogSection>> {
    return await this._logSectionRepository.read(id);
  }
  async readAll(
    args?: TSearch<TLogSection>,
  ): Promise<TRepositoryResponse<TLogSection[]>> {
    return await this._logSectionRepository.readAll(args);
  }
  /* Update */
  async update(
    data: UpdateLogSectionDTO,
  ): Promise<TRepositoryResponse<TLogSection>> {
    return await this._logSectionRepository.update(data);
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogSection>> {
    return await this._logSectionRepository.delete(id);
  }
}
