import { Injectable } from '@nestjs/common';
/* Types */
import { TLogDAO } from '@src/log/types/daoLog.type';
import { TLog } from '@src/log/types/log.type';
/* DTOs */
import { CreateLogDTO } from '@src/log/DTOs/createLog.dto';
import { UpdateLogDTO } from '@src/log/DTOs/updateLog.dto';
/* Libs */
import * as fs from 'fs';
@Injectable()
export class FSLogDAO implements TLogDAO {
  async create(data: CreateLogDTO): Promise<TLog> {
    try {
      const logs: TLog[] = await this.readLogsFile();
      const newLog: TLog = {
        ...data,
        _id: (logs.length + 1).toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      logs.push(newLog);
      await fs.promises.writeFile(
        'src/log/data/logs.json',
        JSON.stringify(logs),
      );
      return newLog;
    } catch (error) {
      throw new Error('Error creating log');
    }
  }
  async read(id: string): Promise<TLog> {
    try {
      const logs: TLog[] = await this.readLogsFile();
      const log: TLog | undefined = logs.find((log) => log._id === id);
      if (!log) throw new Error('Log not found');
      return log;
    } catch (error) {
      throw new Error('Error reading log');
    }
  }
  async readAll(): Promise<TLog[]> {
    try {
      const logs: TLog[] = await this.readLogsFile();
      return logs;
    } catch (error) {
      throw new Error('Error reading logs');
    }
  }
  async update(log: UpdateLogDTO): Promise<TLog> {
    try {
      const logs: TLog[] = await this.readLogsFile();
      const logIndex: number = logs.findIndex((log) => log._id === log._id);
      if (logIndex === -1) throw new Error('Log not found');
      logs[logIndex] = {
        ...logs[logIndex],
        ...log,
        updatedAt: new Date(),
      };
      await fs.promises.writeFile(
        'src/log/data/logs.json',
        JSON.stringify(logs),
      );
      return logs[logIndex];
    } catch (error) {
      throw new Error('Error updating log');
    }
  }
  async delete(id: string): Promise<TLog> {
    try {
      const logs: TLog[] = await this.readLogsFile();
      const logIndex: number = logs.findIndex((log) => log._id === id);
      if (logIndex === -1) throw new Error('Log not found');
      const deletedLog: TLog = logs.splice(logIndex, 1)[0];
      await fs.promises.writeFile(
        'src/log/data/logs.json',
        JSON.stringify(logs),
      );
      return deletedLog;
    } catch (error) {
      throw new Error('Error deleting log');
    }
  }
  private async readLogsFile(): Promise<TLog[]> {
    try {
      let logs: TLog[] = [];
      const logsFile = await fs.promises.readFile(
        'src/log/data/logs.json',
        'utf-8',
      );
      if (!!logsFile) {
        logs = JSON.parse(logsFile);
      }
      return logs;
    } catch (error) {
      throw new Error('Error reading logs file');
    }
  }
}
