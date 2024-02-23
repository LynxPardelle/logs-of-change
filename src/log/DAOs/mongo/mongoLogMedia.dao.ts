import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
/* Types */
import { TLogMediaDAO } from '@src/log/types/daoLog.type';
import { TLogMedia } from '@src/log/types/logMedia.type';
/* DTOs */
import { CreateLogMediaDTO } from '@src/log/DTOs/createLogMedia.dto';
import { UpdateLogMediaDTO } from '@src/log/DTOs/updateLogMedia.dto';
/* Schemas */
import {
  LogMediaDocument,
  LogMediaModel,
} from '@src/log/schemas/logMedia.schema';
import { TSearch } from '@src/shared/types/search.type';

@Injectable()
export class MongoDBLogMediaDAO implements TLogMediaDAO {
  constructor(@InjectModel('LogMedia') private _logMediaModel: LogMediaModel) {}
  async create(logMedia: CreateLogMediaDTO): Promise<TLogMedia> {
    let newLogMedia: LogMediaDocument = new this._logMediaModel(logMedia);
    newLogMedia = await newLogMedia.save();
    if (!newLogMedia || !newLogMedia._id) {
      throw new Error('Error creating log media');
    }
    return newLogMedia as TLogMedia;
  }
  async read(id: string): Promise<TLogMedia> {
    const logMedia: LogMediaDocument | null =
      await this._logMediaModel.findById(id);
    if (!logMedia) {
      throw new Error('Log media not found');
    }
    return logMedia as TLogMedia;
  }
  async readAll(args?: TSearch<TLogMedia>): Promise<TLogMedia[]> {
    const logMedias: LogMediaDocument[] = await this._logMediaModel.find();
    if (!logMedias) {
      throw new Error('Log medias not found');
    }
    if (!logMedias.length) {
      throw new Error("Log medias doesn't contain anything");
    }
    return logMedias as TLogMedia[];
  }
  async update(logMedia: UpdateLogMediaDTO): Promise<TLogMedia> {
    const updatedLogMedia: LogMediaDocument | null =
      await this._logMediaModel.findByIdAndUpdate(logMedia._id, logMedia, {
        new: true,
      });
    if (!updatedLogMedia) {
      throw new Error('Log media not found');
    }
    return updatedLogMedia as TLogMedia;
  }
  async delete(id: string): Promise<TLogMedia> {
    const deletedLogMedia: LogMediaDocument | null =
      await this._logMediaModel.findByIdAndDelete(id);
    if (!deletedLogMedia) {
      throw new Error('Log media not found');
    }
    return deletedLogMedia as TLogMedia;
  }
}
