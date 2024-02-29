import { Inject, Injectable } from '@nestjs/common';
/* Types */
import { TLogTextDAO, TLogSectionDAO } from '../types/daoLog.type';
import { TLogTextRepository } from '../types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TLogText } from '../types/logText.type';
import { TLogSection } from '../types/logSection.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogTextDTO } from '../DTOs/createLogText.dto';
import { UpdateLogTextDTO } from '../DTOs/updateLogText.dto';
import { UpdateLogSectionDTO } from '../DTOs/updateLogSection.dto';
@Injectable()
export default class LogTextRepository implements TLogTextRepository {
  constructor(
    @Inject('LogTextDAO') private _logTextDAO: TLogTextDAO,
    @Inject('LogSectionDAO') private _logSectionDAO: TLogSectionDAO,
  ) {}
  /* Create */
  async create(
    data: CreateLogTextDTO,
    args: { logSectionId: string },
  ): Promise<TRepositoryResponse<TLogText>> {
    try {
      if (!args.logSectionId) throw new Error('Log section id is required');
      const logSection: TLogSection = await this._logSectionDAO.read(
        args.logSectionId,
      );
      if (!logSection) throw new Error('Log section not found');
      const logText: TLogText = await this._logTextDAO.create(data);
      if (!logText || !logText._id) {
        throw new Error('Error creating log text');
      }
      logSection.texts.push(logText._id);
      logSection.updatedAt = new Date();
      const logSectionUpdated: TLogSection = await this._logSectionDAO.update(
        new UpdateLogSectionDTO(logSection),
      );
      if (!logSectionUpdated) throw new Error('Error updating log section');
      return {
        message: 'Log text created',
        status: 'success',
        data: logText,
      };
    } catch (error) {
      return {
        message: 'Error creating log text',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogText>> {
    try {
      const logText: TLogText = await this._logTextDAO.read(id);
      return {
        message: 'Log text found',
        status: 'success',
        data: logText as TLogText,
      };
    } catch (error) {
      return {
        message: 'Error reading log text',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read All */
  async readAll(
    search: TSearch<TLogText>,
  ): Promise<TRepositoryResponse<TLogText[]>> {
    try {
      const logTexts: TLogText[] = await this._logTextDAO.readAll(search);
      return {
        message: 'Log texts found',
        status: 'success',
        data: logTexts,
      };
    } catch (error) {
      return {
        message: 'Error reading log texts',
        status: 'error',
        error: error,
      };
    }
  }
  /* Update */
  async update(
    logText: UpdateLogTextDTO,
  ): Promise<TRepositoryResponse<TLogText>> {
    try {
      const logTextUpdated: TLogText = await this._logTextDAO.update(logText);
      if (!logTextUpdated) throw new Error('Error updating log text');
      return {
        message: 'Log text updated',
        status: 'success',
        data: logTextUpdated,
      };
    } catch (error) {
      return {
        message: 'Error updating log text',
        status: 'error',
        error: error,
      };
    }
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogText>> {
    try {
      const logText: TLogText = await this._logTextDAO.delete(id);
      if (!logText) throw new Error('Error deleting log text');
      return {
        message: 'Log text deleted',
        status: 'success',
        data: logText,
      };
    } catch (error) {
      return {
        message: 'Error deleting log text',
        status: 'error',
        error: error,
      };
    }
  }
}
