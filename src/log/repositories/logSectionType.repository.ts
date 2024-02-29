import { Inject, Injectable } from '@nestjs/common';
/* Types */
import { TLogSectionTypeDAO } from '../types/daoLog.type';
import { TLogSectionTypeRepository } from '../types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TLogSectionType } from '../types/logSectionType.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionTypeDTO } from '../DTOs/createLogSectionType.dto';
import { UpdateLogSectionTypeDTO } from '../DTOs/updateLogSectionType.dto';
@Injectable()
export default class LogSectionTypeRepository
  implements TLogSectionTypeRepository
{
  constructor(
    @Inject('LogSectionTypeDAO') private _logSectionTypeDAO: TLogSectionTypeDAO,
  ) {}
  /* Create */
  async create(
    data: CreateLogSectionTypeDTO,
  ): Promise<TRepositoryResponse<TLogSectionType>> {
    try {
      const logSectionType: TLogSectionType =
        await this._logSectionTypeDAO.create(data);
      if (!logSectionType || !logSectionType._id) {
        throw new Error('Error creating log section type');
      }
      return {
        message: 'Log section type created',
        status: 'success',
        data: logSectionType,
      };
    } catch (error) {
      return {
        message: 'Error creating log section type',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogSectionType>> {
    try {
      const logSectionType: TLogSectionType =
        await this._logSectionTypeDAO.read(id);
      return {
        message: 'Log section type found',
        status: 'success',
        data: logSectionType as TLogSectionType,
      };
    } catch (error) {
      return {
        message: 'Error reading log section type',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read All */
  async readAll(
    args?: TSearch<TLogSectionType>,
  ): Promise<TRepositoryResponse<TLogSectionType[]>> {
    try {
      const logSectionTypes: TLogSectionType[] =
        await this._logSectionTypeDAO.readAll(args);
      return {
        message: 'Log section types found',
        status: 'success',
        data: logSectionTypes as TLogSectionType[],
      };
    } catch (error) {
      return {
        message: 'Error reading log section types',
        status: 'error',
        error: error,
      };
    }
  }
  /* Update */
  async update(
    data: UpdateLogSectionTypeDTO,
  ): Promise<TRepositoryResponse<TLogSectionType>> {
    try {
      const logSectionType: TLogSectionType =
        await this._logSectionTypeDAO.update(data);
      return {
        message: 'Log section type updated',
        status: 'success',
        data: logSectionType,
      };
    } catch (error) {
      return {
        message: 'Error updating log section type',
        status: 'error',
        error: error,
      };
    }
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogSectionType>> {
    try {
      const logSectionType: TLogSectionType =
        await this._logSectionTypeDAO.delete(id);
      return {
        message: 'Log section type deleted',
        status: 'success',
        data: logSectionType,
      };
    } catch (error) {
      return {
        message: 'Error deleting log section type',
        status: 'error',
        error: error,
      };
    }
  }
}
