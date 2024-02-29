import { Injectable } from '@nestjs/common';
/* Types */
import { TLogMediaDAO } from '@src/log/types/daoLog.type';
import { TLogMedia } from '@src/log/types/logMedia.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogMediaDTO } from '@src/log/DTOs/createLogMedia.dto';
import { UpdateLogMediaDTO } from '@src/log/DTOs/updateLogMedia.dto';
/* Libs */
import * as fs from 'fs';
@Injectable()
export class FSLogMediaDAO implements TLogMediaDAO {
  async create(data: CreateLogMediaDTO): Promise<TLogMedia> {
    try {
      const logMedias: TLogMedia[] = await this.readLogMediasFile();
      const newLogMedia: TLogMedia = {
        ...data,
        _id: (logMedias.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      logMedias.push(newLogMedia);
      await fs.promises.writeFile(
        'src/log/data/logMedias.json',
        JSON.stringify(logMedias),
      );
      return newLogMedia;
    } catch (error) {
      throw new Error('Error creating log media');
    }
  }
  async read(id: string): Promise<TLogMedia> {
    try {
      const logMedias: TLogMedia[] = await this.readLogMediasFile();
      const logMedia: TLogMedia | undefined = logMedias.find(
        (logMedia) => logMedia._id === id,
      );
      if (!logMedia) throw new Error('Log media not found');
      return logMedia;
    } catch (error) {
      throw new Error('Error reading log media');
    }
  }
  async readAll(args?: TSearch<TLogMedia>): Promise<TLogMedia[]> {
    try {
      const logMedias: TLogMedia[] = await this.readLogMediasFile();
      return logMedias;
    } catch (error) {
      throw new Error('Error reading log medias');
    }
  }
  async update(logMedia: UpdateLogMediaDTO): Promise<TLogMedia> {
    try {
      const logMedias: TLogMedia[] = await this.readLogMediasFile();
      const logMediaIndex: number = logMedias.findIndex(
        (logMedia) => logMedia._id === logMedia._id,
      );
      if (logMediaIndex === -1) throw new Error('Log media not found');
      logMedias[logMediaIndex] = {
        ...logMedias[logMediaIndex],
        ...logMedia,
        updatedAt: new Date(),
      };
      await fs.promises.writeFile(
        'src/log/data/logMedias.json',
        JSON.stringify(logMedias),
      );
      return logMedias[logMediaIndex];
    } catch (error) {
      throw new Error('Error updating log media');
    }
  }
  async delete(id: string): Promise<TLogMedia> {
    try {
      const logMedias: TLogMedia[] = await this.readLogMediasFile();
      const logMediaIndex: number = logMedias.findIndex(
        (logMedia) => logMedia._id === id,
      );
      if (logMediaIndex === -1) throw new Error('Log media not found');
      const deletedLogMedia: TLogMedia = logMedias[logMediaIndex];
      logMedias.splice(logMediaIndex, 1);
      await fs.promises.writeFile(
        'src/log/data/logMedias.json',
        JSON.stringify(logMedias),
      );
      return deletedLogMedia;
    } catch (error) {
      throw new Error('Error deleting log media');
    }
  }
  private async readLogMediasFile(): Promise<TLogMedia[]> {
    try {
      let logMedias: TLogMedia[] = [];
      const logMediasFile: string = await fs.promises.readFile(
        'src/log/data/logMedias.json',
        'utf-8',
      );
      if (!!logMediasFile) {
        logMedias = JSON.parse(logMediasFile);
      }
      return logMedias;
    } catch (error) {
      throw new Error('Error reading log medias');
    }
  }
}
