import { Injectable } from '@nestjs/common';
/* Types */
import { TChangeLogDAO } from '@src/log/types/daoLog.type';
import { TChangeLog } from '@src/log/types/changeLog.type';
import { TSearch } from '@src/shared/types/search.type';
/* DTOs */
import { CreateChangeLogDTO } from '@src/log/DTOs/createChangeLog.dto';
import { UpdateChangeLogDTO } from '@src/log/DTOs/updateChangeLog.dto';
/* Libs */
import * as fs from 'fs';
@Injectable()
export class FSChangeLogDAO implements TChangeLogDAO {
  async create(data: CreateChangeLogDTO): Promise<TChangeLog> {
    try {
      const changeLogs: TChangeLog[] = await this.readChangeLogsFile();
      const newChangeLog: TChangeLog = {
        ...data,
        _id: (changeLogs.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      changeLogs.push(newChangeLog);
      await fs.promises.writeFile(
        'src/log/data/changeLogs.json',
        JSON.stringify(changeLogs),
      );
      return newChangeLog;
    } catch (error) {}
  }
  async read(id: string): Promise<TChangeLog> {
    try {
      const changeLogs: TChangeLog[] = await this.readChangeLogsFile();
      const changeLog: TChangeLog | undefined = changeLogs.find(
        (changeLog) => changeLog._id === id,
      );
      if (!changeLog) throw new Error('Change log not found');
      return changeLog;
    } catch (error) {
      throw new Error('Error reading change log');
    }
  }
  async readAll(args?: TSearch<TChangeLog>): Promise<TChangeLog[]> {
    try {
      const changeLogs: TChangeLog[] = await this.readChangeLogsFile();
      return changeLogs;
    } catch (error) {
      throw new Error('Error reading change logs');
    }
  }
  async update(changeLog: UpdateChangeLogDTO): Promise<TChangeLog> {
    try {
      const changeLogs: TChangeLog[] = await this.readChangeLogsFile();
      const changeLogIndex: number = changeLogs.findIndex(
        (changeLog) => changeLog._id === changeLog._id,
      );
      if (changeLogIndex === -1) throw new Error('Change log not found');
      changeLogs[changeLogIndex] = {
        ...changeLogs[changeLogIndex],
        ...changeLog,
        updatedAt: new Date(),
      };
      await fs.promises.writeFile(
        'src/log/data/changeLogs.json',
        JSON.stringify(changeLogs),
      );
      return changeLogs[changeLogIndex];
    } catch (error) {
      throw new Error('Error updating change log');
    }
  }
  async delete(id: string): Promise<TChangeLog> {
    try {
      const changeLogs: TChangeLog[] = await this.readChangeLogsFile();
      const changeLogIndex: number = changeLogs.findIndex(
        (changeLog) => changeLog._id === id,
      );
      if (changeLogIndex === -1) throw new Error('Change log not found');
      const changeLogDeleted: TChangeLog = changeLogs.splice(
        changeLogIndex,
        1,
      )[0];
      await fs.promises.writeFile(
        'src/log/data/changeLogs.json',
        JSON.stringify(changeLogs),
      );
      return changeLogDeleted;
    } catch (error) {
      throw new Error('Error deleting change log');
    }
  }
  private async readChangeLogsFile(): Promise<TChangeLog[]> {
    try {
      let changeLogs: TChangeLog[] = [];
      const changeLogsFile = await fs.promises.readFile(
        'src/log/data/changeLogs.json',
        'utf-8',
      );
      if (!!changeLogsFile) {
        changeLogs = JSON.parse(changeLogsFile);
      }
      return changeLogs;
    } catch (error) {
      throw new Error('Error reading change logs file');
    }
  }
}
