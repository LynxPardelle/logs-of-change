import { Injectable } from '@nestjs/common';
/* Types */
import { TLogSectionDAO } from '@src/log/types/daoLog.type';
import { TLogSection, asTLogSection } from '@src/log/types/logSection.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogSectionDTO } from '@src/log/DTOs/createLogSection.dto';
import { UpdateLogSectionDTO } from '@src/log/DTOs/updateLogSection.dto';
/* Schemas */
import { InjectModel } from '@nestjs/mongoose';
import {
  LogSectionDocument,
  LogSectionModel,
} from '@src/log/schemas/logSection.schema';

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
    return asTLogSection(newLogSection);
  }
  async read(id: string): Promise<TLogSection> {
    const logSection: LogSectionDocument | null =
      await this._logSectionModel.findById(id);
    if (!logSection) {
      throw new Error('Log section not found');
    }
    return asTLogSection(logSection);
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
    return logSections.map(asTLogSection);
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
    return asTLogSection(updatedLogSection);
  }
  async delete(id: string): Promise<TLogSection> {
    const deletedLogSection: LogSectionDocument | null =
      await this._logSectionModel.findByIdAndDelete(id);
    if (!deletedLogSection) {
      throw new Error('Log section not found');
    }
    return asTLogSection(deletedLogSection);
  }
}
