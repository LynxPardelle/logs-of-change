import { Inject, Injectable } from '@nestjs/common';
/* Types */
import { TLogRepository } from '../types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TChangeLogDAO, TLogDAO } from '../types/daoLog.type';
import { TChangeLog } from '../types/changeLog.type';
import { TSearch } from '@src/shared/types/search.type';
import { TLog } from '../types/log.type';
/* DTOs */
import { CreateLogDTO } from '../DTOs/createLog.dto';
import { UpdateLogDTO } from '../DTOs/updateLog.dto';
import { UpdateChangeLogDTO } from '../DTOs/updateChangeLog.dto';
/* Services */
import { LoggerService } from '@src/shared/services/logger.service';
@Injectable()
export default class LogRepository implements TLogRepository {
  constructor(
    @Inject('LogDAO') private _logDAO: TLogDAO,
    @Inject('ChangeLogDAO') private _changeLogDAO: TChangeLogDAO,
    private _loggerService: LoggerService,
  ) {}
  /* Create */
  async create(
    data: CreateLogDTO,
    args: { changeLogId: string },
  ): Promise<TRepositoryResponse<TLog>> {
    try {
      this._loggerService.info(
        `args: ${JSON.stringify(args)}`,
        'LogRepository.create',
      );
      if (!args.changeLogId) throw new Error('Change log id is required');
      const changeLog: TChangeLog = await this._changeLogDAO.read(
        args.changeLogId,
      );
      this._loggerService.info(
        `changeLog: ${JSON.stringify(changeLog)}`,
        'LogRepository.create',
      );
      if (!changeLog) throw new Error('Change log not found');
      let newLog: TLog = await this._logDAO.create(data);
      this._loggerService.info(
        `newLog: ${JSON.stringify(newLog)}`,
        'LogRepository.create',
      );
      if (!newLog || !newLog._id) {
        throw new Error('Error creating log');
      }
      changeLog.logs.push(newLog._id);
      changeLog.updatedAt = new Date();
      const changeLogUpdated: TChangeLog = await this._changeLogDAO.update(
        new UpdateChangeLogDTO(changeLog),
      );
      this._loggerService.info(
        `changeLogUpdated: ${JSON.stringify(changeLogUpdated)}`,
        'LogRepository.create',
      );
      if (!changeLogUpdated) throw new Error('Error updating change log');
      return {
        message: 'Log created',
        status: 'success',
        data: newLog,
      };
    } catch (error) {
      return {
        message: 'Error creating log',
        status: 'error',
        error,
      };
    }
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLog>> {
    try {
      const log: TLog = await this._logDAO.read(id);
      if (!log) {
        throw new Error('Log not found');
      }
      return {
        message: 'Log found',
        status: 'success',
        data: log,
      };
    } catch (error) {
      return {
        message: 'Error reading log',
        status: 'error',
        error,
      };
    }
  }
  async readAll(
    args?: TSearch<TChangeLog>,
  ): Promise<TRepositoryResponse<TLog[]>> {
    try {
      const logs: TLog[] = await this._logDAO.readAll(args);
      return {
        message: 'Logs found',
        status: 'success',
        data: logs,
      };
    } catch (error) {
      return {
        message: 'Error reading logs',
        status: 'error',
        error,
      };
    }
  }
  /* Update */
  async update(log: UpdateLogDTO): Promise<TRepositoryResponse<TLog>> {
    try {
      const updatedLog: TLog = await this._logDAO.update(log);
      if (!updatedLog) {
        throw new Error('Log not found');
      }
      return {
        message: 'Log updated',
        status: 'success',
        data: updatedLog,
      };
    } catch (error) {
      return {
        message: 'Error updating log',
        status: 'error',
        error,
      };
    }
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLog>> {
    try {
      const deletedLog: TLog = await this._logDAO.delete(id);
      if (!deletedLog) {
        throw new Error('Log not found');
      }
      return {
        message: 'Log deleted',
        status: 'success',
        data: deletedLog,
      };
    } catch (error) {
      return {
        message: 'Error deleting log',
        status: 'error',
        error,
      };
    }
  }
}
