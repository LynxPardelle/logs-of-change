import { Injectable } from '@nestjs/common';
/* Types */
import { TLogSectionTypeDAO } from '@src/log/types/daoLog.type';
import {
  TLogSectionType,
  asTLogSectionType,
} from '@src/log/types/logSectionType.type';
/* DTOs */
import { CreateLogSectionTypeDTO } from '@src/log/DTOs/createLogSectionType.dto';
import { UpdateLogSectionTypeDTO } from '@src/log/DTOs/updateLogSectionType.dto';
import { TSearch } from '@src/shared/types/search.type';
/* Schemas */
import { InjectModel } from '@nestjs/mongoose';
import {
  LogSectionTypeDocument,
  LogSectionTypeModel,
} from '@src/log/schemas/logSectionType.schema';

@Injectable()
export class MongoDBLogSectionTypeDAO implements TLogSectionTypeDAO {
  constructor(
    @InjectModel('LogSectionType')
    private _logSectionTypeModel: LogSectionTypeModel,
  ) {}
  async create(
    logSectionType: CreateLogSectionTypeDTO,
  ): Promise<TLogSectionType> {
    let newLogSectionType: LogSectionTypeDocument =
      new this._logSectionTypeModel(logSectionType);
    newLogSectionType = await newLogSectionType.save();
    if (!newLogSectionType || !newLogSectionType._id) {
      throw new Error('Error creating log section type');
    }
    return asTLogSectionType(newLogSectionType);
  }
  async read(id: string): Promise<TLogSectionType> {
    const logSectionType: LogSectionTypeDocument | null =
      await this._logSectionTypeModel.findById(id);
    if (!logSectionType) {
      throw new Error('Log section type not found');
    }
    return asTLogSectionType(logSectionType);
  }
  async readAll(args?: TSearch<TLogSectionType>): Promise<TLogSectionType[]> {
    const logSectionTypes: LogSectionTypeDocument[] =
      await this._logSectionTypeModel.find();
    if (!logSectionTypes) {
      throw new Error('Log section types not found');
    }
    if (!logSectionTypes.length) {
      throw new Error("Log section types doesn't contain anything");
    }
    return logSectionTypes.map(asTLogSectionType);
  }
  async update(
    logSectionType: UpdateLogSectionTypeDTO,
  ): Promise<TLogSectionType> {
    const updatedLogSectionType: LogSectionTypeDocument | null =
      await this._logSectionTypeModel.findByIdAndUpdate(
        logSectionType._id,
        logSectionType,
        {
          new: true,
        },
      );
    if (!updatedLogSectionType) {
      throw new Error('Log section type not found');
    }
    return asTLogSectionType(updatedLogSectionType);
  }
  async delete(id: string): Promise<TLogSectionType> {
    const deletedLogSectionType: LogSectionTypeDocument | null =
      await this._logSectionTypeModel.findByIdAndDelete(id);
    if (!deletedLogSectionType) {
      throw new Error('Log section type not found');
    }
    return asTLogSectionType(deletedLogSectionType);
  }
}
