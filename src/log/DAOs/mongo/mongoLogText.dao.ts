import { Injectable } from '@nestjs/common';
/* Types */
import { TLogTextDAO } from '@src/log/types/daoLog.type';
import { TLogText, asTLogText } from '@src/log/types/logText.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateLogTextDTO } from '@src/log/DTOs/createLogText.dto';
import { UpdateLogTextDTO } from '@src/log/DTOs/updateLogText.dto';
/* Schemas */
import { InjectModel } from '@nestjs/mongoose';
import { LogTextDocument, LogTextModel } from '@src/log/schemas/logText.schema';

@Injectable()
export class MongoDBLogTextDAO implements TLogTextDAO {
  constructor(@InjectModel('LogText') private _logTextModel: LogTextModel) {}
  async create(logText: CreateLogTextDTO): Promise<TLogText> {
    let newLogText: LogTextDocument = new this._logTextModel(logText);
    newLogText = await newLogText.save();
    if (!newLogText || !newLogText._id) {
      throw new Error('Error creating log text');
    }
    return asTLogText(newLogText);
  }
  async read(id: string): Promise<TLogText> {
    const logText: LogTextDocument | null =
      await this._logTextModel.findById(id);
    if (!logText) {
      throw new Error('Log text not found');
    }
    return asTLogText(logText);
  }
  async readAll(args?: TSearch<TLogText>): Promise<TLogText[]> {
    const logTexts: LogTextDocument[] = await this._logTextModel.find();
    if (!logTexts) {
      throw new Error('Log texts not found');
    }
    if (!logTexts.length) {
      throw new Error("Log texts doesn't contain anything");
    }
    return logTexts.map(asTLogText);
  }
  async update(logText: UpdateLogTextDTO): Promise<TLogText> {
    const updatedLogText: LogTextDocument | null =
      await this._logTextModel.findByIdAndUpdate(logText._id, logText, {
        new: true,
      });
    if (!updatedLogText) {
      throw new Error('Log text not found');
    }
    return asTLogText(updatedLogText);
  }
  async delete(id: string): Promise<TLogText> {
    const deletedLogText: LogTextDocument | null =
      await this._logTextModel.findByIdAndDelete(id);
    if (!deletedLogText) {
      throw new Error('Log text not found');
    }
    return asTLogText(deletedLogText);
  }
}
