import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
/* Types */
import { TLogDAO } from '@src/log/types/daoLog.type';
import { TLog } from '@src/log/types/log.type';
/* DTOs */
import { CreateLogDTO } from '@src/log/DTOs/createLog.dto';
import { UpdateLogDTO } from '@src/log/DTOs/updateLog.dto';
/* Schemas */
import { LogDocument, LogModel } from '@src/log/schemas/log.schema';
import { TSearch } from '@src/shared/types/search.type';

@Injectable()
export class MongoDBLogDAO implements TLogDAO {
  constructor(@InjectModel('Log') private _logModel: LogModel) {}
  async create(log: CreateLogDTO): Promise<TLog> {
    let newLog: LogDocument = new this._logModel(log);
    newLog = await newLog.save();
    if (!newLog || !newLog._id) {
      throw new Error('Error creating log');
    }
    return newLog as TLog;
  }
  async read(id: string): Promise<TLog> {
    const log: LogDocument | null = await this._logModel.findById(id);
    if (!log) {
      throw new Error('Log not found');
    }
    return log as TLog;
  }
  async readAll(args?: TSearch<TLog>): Promise<TLog[]> {
    const logs: LogDocument[] = await this._logModel.find();
    if (!logs) {
      throw new Error('Logs not found');
    }
    if (!logs.length) {
      throw new Error("Logs doesn't contain anything");
    }
    return logs as TLog[];
  }
  async update(log: UpdateLogDTO): Promise<TLog> {
    const updatedLog: LogDocument | null =
      await this._logModel.findByIdAndUpdate(log._id, log, { new: true });
    if (!updatedLog) {
      throw new Error('Log not found');
    }
    return updatedLog as TLog;
  }
  async delete(id: string): Promise<TLog> {
    const deletedLog: LogDocument | null =
      await this._logModel.findByIdAndDelete(id);
    if (!deletedLog) {
      throw new Error('Log not found');
    }
    return deletedLog as TLog;
  }
}
