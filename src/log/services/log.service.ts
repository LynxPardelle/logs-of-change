import { Injectable } from '@nestjs/common';
/* Repositories */
import LogRepository from '@src/log/repositories/log.repository';
/* Types */
import { TLog } from '@src/log/types/log.type';
import { TLogRepository } from '@src/log/types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogDTO } from '@src/log/DTOs/createLog.dto';
import { UpdateLogDTO } from '@src/log/DTOs/updateLog.dto';
@Injectable()
export class LogService implements TLogRepository {
  constructor(private _logRepository: LogRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
  /* Create */
  async create(
    data: CreateLogDTO,
    args?: { changeLogId: string },
  ): Promise<TRepositoryResponse<TLog>> {
    return await this._logRepository.create(data, args);
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLog>> {
    return await this._logRepository.read(id);
  }
  async readAll(args?: TSearch<TLog>): Promise<TRepositoryResponse<TLog[]>> {
    return await this._logRepository.readAll(args);
  }
  /* Update */
  async update(data: UpdateLogDTO): Promise<TRepositoryResponse<TLog>> {
    return await this._logRepository.update(data);
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLog>> {
    return await this._logRepository.delete(id);
  }
}
