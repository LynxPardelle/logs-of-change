import { Inject, Injectable } from '@nestjs/common';
/* Types */
import { TLogSectionDAO, TLogDAO } from '../types/daoLog.type';
import { TLogSectionRepository } from '../types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TLogSection } from '../types/logSection.type';
import { TSearch } from '@src/shared/types/search.type';
import { TLog } from '../types/log.type';
/* DTOs */
import { CreateLogSectionDTO } from '../DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '../DTOs/updateLogSection.dto';
import { UpdateLogDTO } from '../DTOs/updateLog.dto';
@Injectable()
export default class LogSectionRepository implements TLogSectionRepository {
  constructor(
    @Inject('LogSectionDAO') private _logSectionDAO: TLogSectionDAO,
    @Inject('LogDAO') private _logDAO: TLogDAO,
  ) {}
  /* Create */
  async create(
    data: CreateLogSectionDTO,
    args: { logId: string },
  ): Promise<TRepositoryResponse<TLogSection>> {
    try {
      if (!args.logId) throw new Error('Log id is required');
      const log: TLog = await this._logDAO.read(args.logId);
      if (!log) throw new Error('Log not found');
      const logSection: TLogSection = await this._logSectionDAO.create(data);
      if (!logSection || !logSection._id) {
        throw new Error('Error creating log section');
      }
      log.logSections.push(logSection._id);
      log.updatedAt = new Date();
      const logUpdated: TLog = await this._logDAO.update(new UpdateLogDTO(log));
      if (!logUpdated) throw new Error('Error updating log');
      return {
        message: 'Log section created',
        status: 'success',
        data: logSection,
      };
    } catch (error) {
      return {
        message: 'Error creating log section',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogSection>> {
    try {
      const logSection: TLogSection = await this._logSectionDAO.read(id);
      return {
        message: 'Log section found',
        status: 'success',
        data: logSection as TLogSection,
      };
    } catch (error) {
      return {
        message: 'Error reading log section',
        status: 'error',
        error: error,
      };
    }
  }
  async readAll(
    args: TSearch<TLogSection>,
  ): Promise<TRepositoryResponse<TLogSection[]>> {
    try {
      const logSections: TLogSection[] =
        await this._logSectionDAO.readAll(args);
      return {
        message: 'Log sections found',
        status: 'success',
        data: logSections,
      };
    } catch (error) {
      return {
        message: 'Error reading log sections',
        status: 'error',
        error: error,
      };
    }
  }
  /* Update */
  async update(
    logSection: UpdateLogSectionDTO,
  ): Promise<TRepositoryResponse<TLogSection>> {
    try {
      const logSectionUpdated: TLogSection =
        await this._logSectionDAO.update(logSection);
      if (!logSectionUpdated) throw new Error('Error updating log section');
      return {
        message: 'Log section updated',
        status: 'success',
        data: logSectionUpdated,
      };
    } catch (error) {
      return {
        message: 'Error updating log section',
        status: 'error',
        error: error,
      };
    }
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogSection>> {
    try {
      const logSectionDeleted: TLogSection =
        await this._logSectionDAO.delete(id);
      if (!logSectionDeleted) throw new Error('Error deleting log section');
      return {
        message: 'Log section deleted',
        status: 'success',
        data: logSectionDeleted,
      };
    } catch (error) {
      return {
        message: 'Error deleting log section',
        status: 'error',
        error: error,
      };
    }
  }
}
