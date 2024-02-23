import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
/* Types */
import { TLogSectionDAO } from '@src/log/types/daoLog.type';
import { TLogSection } from '@src/log/types/logSection.type';
/* DTOs */
import { CreateLogSectionDTO } from '@src/log/DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '@src/log/DTOs/updateLogSection.dto';
/* Schemas */
import {
  LogSectionDocument,
  LogSectionModel,
} from '@src/log/schemas/logSection.schema';
import { TSearch } from '@src/shared/types/search.type';

@Injectable()
export class MongoDBLogSectionDAO implements TLogSectionDAO {
  constructor(
    @InjectModel('LogSection') private _logSectionModel: LogSectionModel,
  ) {}
  async create(logSection: CreateLogSectionDTO): Promise<TLogSection> {
    let newLogSection: LogSectionDocument = new this._logSectionModel(
      logSection,
    );
    newLogSection = await newLogSection.save();
    if (!newLogSection || !newLogSection._id) {
      throw new Error('Error creating log section');
    }
    return newLogSection as TLogSection;
  }
  async read(id: string): Promise<TLogSection> {
    const logSection: LogSectionDocument | null =
      await this._logSectionModel.findById(id);
    if (!logSection) {
      throw new Error('Log section not found');
    }
    return logSection as TLogSection;
  }
  async readAll(args?: TSearch<TLogSection>): Promise<TLogSection[]> {
    const logSections: LogSectionDocument[] =
      await this._logSectionModel.find();
    if (!logSections) {
      throw new Error('Log sections not found');
    }
    if (!logSections.length) {
      throw new Error("Log sections doesn't contain anything");
    }
    return logSections as TLogSection[];
  }
  async update(logSection: UpdateLogSectionDTO): Promise<TLogSection> {
    const updatedLogSection: LogSectionDocument | null =
      await this._logSectionModel.findByIdAndUpdate(
        logSection._id,
        logSection,
        {
          new: true,
        },
      );
    if (!updatedLogSection) {
      throw new Error('Log section not found');
    }
    return updatedLogSection as TLogSection;
  }
  async delete(id: string): Promise<TLogSection> {
    const deletedLogSection: LogSectionDocument | null =
      await this._logSectionModel.findByIdAndDelete(id);
    if (!deletedLogSection) {
      throw new Error('Log section not found');
    }
    return deletedLogSection as TLogSection;
  }
}
