import { Injectable } from '@nestjs/common';
/* Repositories */
import LogSectionTypeRepository from '@src/log/repositories/logSectionType.repository';
/* Types */
import { TLogSectionType } from '@src/log/types/logSectionType.type';
import { TLogSectionTypeRepository } from '@src/log/types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionTypeDTO } from '@src/log/DTOs/createLogSectionType.dto';
import { UpdateLogSectionTypeDTO } from '@src/log/DTOs/updateLogSectionType.dto';
@Injectable()
export class LogSectionTypeService implements TLogSectionTypeRepository {
  constructor(private _logSectionTypeRepository: LogSectionTypeRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
  /* Create */
  async create(
    data: CreateLogSectionTypeDTO,
  ): Promise<TRepositoryResponse<TLogSectionType>> {
    return await this._logSectionTypeRepository.create(data);
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogSectionType>> {
    return await this._logSectionTypeRepository.read(id);
  }
  async readAll(
    args?: TSearch<TLogSectionType>,
  ): Promise<TRepositoryResponse<TLogSectionType[]>> {
    return await this._logSectionTypeRepository.readAll(args);
  }
  /* Update */
  async update(
    data: UpdateLogSectionTypeDTO,
  ): Promise<TRepositoryResponse<TLogSectionType>> {
    return await this._logSectionTypeRepository.update(data);
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogSectionType>> {
    return await this._logSectionTypeRepository.delete(id);
  }
}
