import { Injectable } from '@nestjs/common';
/* Types */
import { TChangeLogDAO } from '@src/log/types/daoLog.type';
import { TChangeLog, asTChangeLog } from '@src/log/types/changeLog.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateChangeLogDTO } from '@src/log/DTOs/createChangeLog.dto';
import { UpdateChangeLogDTO } from '@src/log/DTOs/updateChangeLog.dto';
/* Schemas */
import { InjectModel } from '@nestjs/mongoose';
import {
  ChangeLogModel,
  ChangeLogDocument,
} from '@src/log/schemas/changeLog.schema';
@Injectable()
export class MongoDBChangeLogDAO implements TChangeLogDAO {
  constructor(
    @InjectModel('ChangeLog') private _changeLogModel: ChangeLogModel,
  ) {}
  async create(data: CreateChangeLogDTO): Promise<TChangeLog> {
    let newChangeLog: ChangeLogDocument = new this._changeLogModel(data);
    newChangeLog = await newChangeLog.save();
    if (!newChangeLog || !newChangeLog._id) {
      throw new Error('Error creating change log');
    }
    return asTChangeLog(newChangeLog);
  }
  async read(id: string): Promise<TChangeLog> {
    const changeLog: ChangeLogDocument | null =
      await this._changeLogModel.findById(id);
    if (!changeLog) throw new Error('Change log not found');
    return asTChangeLog(changeLog);
  }
  async readAll(args?: TSearch<TChangeLog>): Promise<TChangeLog[]> {
    const changeLogs: ChangeLogDocument[] = await this._changeLogModel.find();
    if (!changeLogs) throw new Error('Change logs not found');
    if (!changeLogs.length)
      throw new Error("Change logs doesn't contain anything");
    return changeLogs.map(asTChangeLog);
  }
  async update(changeLog: UpdateChangeLogDTO): Promise<TChangeLog> {
    const changeLogUpdated: ChangeLogDocument | null =
      await this._changeLogModel.findByIdAndUpdate(changeLog._id, changeLog, {
        new: true,
      });
    if (!changeLogUpdated) throw new Error('Change log not found');
    return asTChangeLog(changeLogUpdated);
  }
  async delete(id: string): Promise<TChangeLog> {
    const changeLogDeleted: ChangeLogDocument | null =
      await this._changeLogModel.findByIdAndDelete(id);
    if (!changeLogDeleted) throw new Error('Change log not found');
    return asTChangeLog(changeLogDeleted);
  }
}
