import { Injectable } from '@nestjs/common';
/* Repositories */
import LogTextRepository from '@src/log/repositories/logText.repository';
/* Types */
import { TLogText } from '@src/log/types/logText.type';
import { TLogTextRepository } from '@src/log/types/repositoryLog.type';
import { TRepositoryResponse } from '@src/shared/types/repositoryResponse.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogTextDTO } from '@src/log/DTOs/createLogText.dto';
import { UpdateLogTextDTO } from '@src/log/DTOs/updateLogText.dto';
@Injectable()
export class LogTextService implements TLogTextRepository {
  constructor(private _logTextRepository: LogTextRepository) {}
  author(): { [key: string]: string } {
    return {
      author: 'Lynx Pardelle',
      site: 'https://lynxpardelle.com',
      github: 'https://github.com/LynxPardelle',
    };
  }
  /* Create */
  async create(
    data: CreateLogTextDTO,
    args: { logSectionId: string },
  ): Promise<TRepositoryResponse<TLogText>> {
    return await this._logTextRepository.create(data, args);
  }
  /* Read */
  async read(id: string): Promise<TRepositoryResponse<TLogText>> {
    return await this._logTextRepository.read(id);
  }
  async readAll(
    args?: TSearch<TLogText>,
  ): Promise<TRepositoryResponse<TLogText[]>> {
    return await this._logTextRepository.readAll(args);
  }
  /* Update */
  async update(data: UpdateLogTextDTO): Promise<TRepositoryResponse<TLogText>> {
    return await this._logTextRepository.update(data);
  }
  /* Delete */
  async delete(id: string): Promise<TRepositoryResponse<TLogText>> {
    return await this._logTextRepository.delete(id);
  }
}
