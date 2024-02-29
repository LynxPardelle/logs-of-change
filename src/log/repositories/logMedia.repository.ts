import { Inject, Injectable } from '@nestjs/common';
/* Types */
import { TLogMediaDAO, TLogSectionDAO } from '../types/daoLog.type';
import { TLogMediaRepository } from '../types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TLogMedia } from '../types/logMedia.type';
import { TLogSection } from '../types/logSection.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogMediaDTO } from '../DTOs/createLogMedia.dto';
import { UpdateLogMediaDTO } from '../DTOs/updateLogMedia.dto';
import { UpdateLogSectionDTO } from '../DTOs/updateLogSection.dto';
@Injectable()
export default class LogMediaRepository implements TLogMediaRepository {
  constructor(
    @Inject('LogMediaDAO') private _logMediaDAO: TLogMediaDAO,
    @Inject('LogSectionDAO') private _logSectionDAO: TLogSectionDAO,
  ) {}
  /* Create */
  async create(
    data: CreateLogMediaDTO,
    args: { logSectionId: string },
  ): Promise<TRepositoryResponse<TLogMedia>> {
    try {
      if (!args.logSectionId) throw new Error('Log section id is required');
      const logSection: TLogSection = await this._logSectionDAO.read(
        args.logSectionId,
      );
      if (!logSection) throw new Error('Log section not found');
      const logMedia: TLogMedia = await this._logMediaDAO.create(data);
      if (!logMedia || !logMedia._id) {
        throw new Error('Error creating log media');
      }
      logSection.media.push(logMedia._id);
      logSection.updatedAt = new Date();

      const logSectionUpdated: TLogSection = await this._logSectionDAO.update(
        new UpdateLogSectionDTO(logSection),
      );
      if (!logSectionUpdated) throw new Error('Error updating log section');
      return {
        message: 'Log media created',
        status: 'success',
        data: logMedia,
      };
    } catch (error) {
      return {
        message: 'Error creating log media',
        status: 'error',
        error: error,
      };
    }
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogMedia>> {
    try {
      const logMedia: TLogMedia = await this._logMediaDAO.read(id);
      return {
        message: 'Log media found',
        status: 'success',
        data: logMedia as TLogMedia,
      };
    } catch (error) {
      return {
        message: 'Error reading log media',
        status: 'error',
        error: error,
      };
    }
  }
  async readAll(
    args?: TSearch<TLogMedia>,
  ): Promise<TRepositoryResponse<TLogMedia[]>> {
    try {
      const logMedias: TLogMedia[] = await this._logMediaDAO.readAll(args);
      return {
        message: 'Log medias found',
        status: 'success',
        data: logMedias as TLogMedia[],
      };
    } catch (error) {
      return {
        message: 'Error reading log medias',
        status: 'error',
        error: error,
      };
    }
  }
  /* Update */
  async update(
    logMedia: UpdateLogMediaDTO,
  ): Promise<TRepositoryResponse<TLogMedia>> {
    try {
      const updatedLogMedia: TLogMedia =
        await this._logMediaDAO.update(logMedia);
      return {
        message: 'Log media updated',
        status: 'success',
        data: updatedLogMedia,
      };
    } catch (error) {
      return {
        message: 'Error updating log media',
        status: 'error',
        error: error,
      };
    }
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogMedia>> {
    try {
      const logMedia: TLogMedia = await this._logMediaDAO.delete(id);
      return {
        message: 'Log media deleted',
        status: 'success',
        data: logMedia,
      };
    } catch (error) {
      return {
        message: 'Error deleting log media',
        status: 'error',
        error: error,
      };
    }
  }
}
