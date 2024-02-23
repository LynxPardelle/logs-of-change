import { Inject, Injectable } from '@nestjs/common';
/* Types */
import { TChangeLogDAO } from '../types/daoLog.type';
import { TChangeLogRepository } from '../types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TChangeLog } from '../types/changeLog.type';
/* DTOs */
import { CreateChangeLogDTO } from '../DTOs/createChangeLog.dto';
import { UpdateChangeLogDTO } from '../DTOs/updateChangeLog.dto';
import { TSearch } from '@src/shared/types/search.type';
@Injectable()
export default class ChangeLogRepository implements TChangeLogRepository {
  constructor(@Inject('ChangeLogDAO') private _changeLogDAO: TChangeLogDAO) {}
  /* Create */
  async create(
    data: CreateChangeLogDTO,
  ): Promise<TRepositoryResponse<TChangeLog>> {
    try {
      const changeLog: TChangeLog = await this._changeLogDAO.create(data);
      return {
        message: 'Change log created',
        status: 'success',
        data: changeLog,
      };
    } catch (error) {
      return {
        message: 'Error creating change log',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TChangeLog>> {
    try {
      const changeLog: TChangeLog = await this._changeLogDAO.read(id);
      return {
        message: 'Change log found',
        status: 'success',
        data: changeLog as TChangeLog,
      };
    } catch (error) {
      return {
        message: 'Error reading change log',
        status: 'error',
        error: error,
      };
    }
  }
  async readAll(
    args?: TSearch<TChangeLog>,
  ): Promise<TRepositoryResponse<TChangeLog[]>> {
    try {
      const changeLogs: TChangeLog[] = await this._changeLogDAO.readAll(args);
      return {
        message: 'Change logs found',
        status: 'success',
        data: changeLogs as TChangeLog[],
      };
    } catch (error) {
      return {
        message: 'Error reading change logs',
        status: 'error',
        error: error,
      };
    }
  }
  /* Update */
  async update(
    data: UpdateChangeLogDTO,
  ): Promise<TRepositoryResponse<TChangeLog>> {
    try {
      const changeLogUpdated: TChangeLog =
        await this._changeLogDAO.update(data);
      if (!changeLogUpdated) throw new Error('Change log not found');
      return {
        message: 'Change log updated',
        status: 'success',
        data: changeLogUpdated as TChangeLog,
      };
    } catch (error) {
      return {
        message: 'Error updating change log',
        status: 'error',
        error: error,
      };
    }
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TChangeLog>> {
    try {
      const changeLogDeleted: TChangeLog = await this._changeLogDAO.delete(id);
      if (!changeLogDeleted) throw new Error('Change log not found');
      return {
        message: 'Change log deleted',
        status: 'success',
        data: changeLogDeleted as TChangeLog,
      };
    } catch (error) {
      return {
        message: 'Error deleting change log',
        status: 'error',
        error: error,
      };
    }
  }
}
