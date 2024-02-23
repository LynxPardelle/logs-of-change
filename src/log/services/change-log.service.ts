import { Injectable } from '@nestjs/common';
/* Repositories */
import ChangeLogRepository from '@src/log/repositories/changeLog.repository';
/* Types */
import { TChangeLog } from '@src/log/types/changeLog.type';
import { TChangeLogRepository } from '@src/log/types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
/* DTOs */
import { CreateChangeLogDTO } from '@src/log/DTOs/createChangeLog.dto';
import { UpdateChangeLogDTO } from '@src/log/DTOs/updateChangeLog.dto';
import { TSearch } from '@src/shared/types/search.type';

@Injectable()
export class ChangeLogService implements TChangeLogRepository {
  constructor(private _changeLogRepository: ChangeLogRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
  /* Create */
  async create(
    data: CreateChangeLogDTO,
  ): Promise<TRepositoryResponse<TChangeLog>> {
    return await this._changeLogRepository.create(data);
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TChangeLog>> {
    return await this._changeLogRepository.read(id);
  }
  async readAll(
    args?: TSearch<TChangeLog>,
  ): Promise<TRepositoryResponse<TChangeLog[]>> {
    return await this._changeLogRepository.readAll(args);
  }
  /* Update */
  async update(
    data: UpdateChangeLogDTO,
  ): Promise<TRepositoryResponse<TChangeLog>> {
    return await this._changeLogRepository.update(data);
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TChangeLog>> {
    return await this._changeLogRepository.delete(id);
  }
}
